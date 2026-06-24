---
title: Sessions
description: Per-conversation state via the @Session() param decorator — in-memory by default, Redis when you scale, write-through on success.
sidebar:
  group: State, sessions & i18n
  order: 70
---

Handlers are stateless on purpose: an update arrives, the handler runs, and
nothing sticks around. The moment your bot needs memory — a cart, a counter, a
user's preferences — you need state that survives between updates and belongs to
the right conversation. That's a session.

A session is not a god-context you reach through. It's a plain object the
framework loads for you and hands to a handler through the `@Session()` param
decorator, the same way `@Sender()` hands you the `User`. You mutate it; the
framework writes it back.

:::mental
load session -> @Session() injects it -> handler mutates\* -> saved on success
:::

## Enable sessions

`SessionModule` is what turns the facility on — it provides `SessionService` and
registers the pipeline stage that loads and saves. Import it once, alongside
`NestgramModule`. Every option is optional: with no arguments you get a
process-local store, the default per-conversation key, and `{}` as the initial
value.

:::code[app.module.ts]{mark="11"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, SessionModule } from 'nestgram';
import { CartRouter, CartSession } from './cart.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
    SessionModule.forRoot({
      defaults: (): CartSession => ({ items: [] }),
    }),
  ],
  providers: [CartRouter],
})
export class AppModule {}
```

:::

`defaults()` seeds the very first load of each conversation. Without it a
brand-new session is `{}` — and the first `cart.items.push(...)` would land on
`undefined`.

:::note
Sessions are off until you import the module — there's no flag to flip. Without
it, `@Session()` resolves to `undefined` rather than throwing, so a router that
uses sessions optionally still runs in an app that doesn't configure them.
:::

## Reading and writing with `@Session()`

`@Session()` injects the session loaded for the current update. There is **no
free `session()` function** — session access is the param decorator, full stop.
(The ambient free functions are `t()` and `locale()` from [i18n](/docs/i18n);
sessions deliberately aren't one of them.) Type the parameter with your own
interface, mutate it in place, and you're done — there is no `save()` to call.

:::code[cart.router.ts]{mark="11"}

```ts
import { Router, Command, Message, Session } from 'nestgram';

export interface CartSession {
  items: number[];
}

@Router()
export class CartRouter {
  @Command('add')
  add(message: Message, @Session() cart: CartSession) {
    cart.items.push(42); // mutate in place — saved after the handler
    return `In the cart: ${cart.items.length}`;
  }

  @Command('cart')
  show(message: Message, @Session() cart: CartSession) {
    return cart.items.length
      ? `Items: ${cart.items.join(', ')}`
      : 'The cart is empty';
  }
}
```

:::

:::anno

1. The interface is **yours** — the framework persists whatever object you keep in it and reserves no fields of its own.
2. Mutating the injected object **is** the write API. `SessionStage.commit()` runs after the handler returns successfully and saves the object back under the same key.
3. The type is an assertion, not a check — `@Session()` can't verify the store really holds a `CartSession`. Keep the interface and the `defaults()` that seeds it next to each other so they can't drift.

:::

Two details worth knowing precisely:

- **Loaded before matching.** `SessionService.load()` runs in the stage's
  `apply()`, before any match predicate. So the same data is readable in
  guards, interceptors and [custom predicates](/docs/custom-predicates) — not
  just the handler. (This is also what lets the [FSM](/docs/fsm) route on
  state.)
- **Saved only on success.** `SessionStage.commit()` runs after the handler
  returns. If no route matched, or the handler threw, nothing is written.

One JavaScript reality check: reassigning the parameter (`cart = { items: [] }`)
changes a local variable, not the session. Mutate properties instead —
`cart.items = []` empties the cart, `cart = ...` does nothing. (The save
deliberately re-reads the object from the ambient store rather than a captured
value, so a genuine *reassignment* would be honoured — but a reassigned local
parameter is a different binding, and TS won't catch that for you.)

:::caution
"Saved only on success" is as strong as your store makes it. The memory store
keeps the live object reference, so in-place mutations are visible immediately —
a handler that mutates and *then* throws has already changed the stored object.
The Redis store's JSON round-trip hands each load a fresh copy, so there a failed
handler really does leave the stored session untouched. Don't build on
rollback-on-throw with the memory store.
:::

### How `@Session()` finds the object — the ambient rail

`@Session()` doesn't reach into a context object. It reads the per-update
ambient store — a framework-owned `AsyncLocalStorage` the dispatcher opens
around each update via `runAmbient`. `SessionService.load()` writes the loaded
object into that store with `setAmbient(SESSION, ...)`; `@Session()` reads it
back with `getAmbient(SESSION)`; the after-handler save re-reads the same key.
All three see one object without anyone threading it through arguments.

That rail is **in-process only**. Work you offload to a queue or worker (e.g.
BullMQ) crosses a process boundary, leaves the `AsyncLocalStorage` behind, and
won't see the session. Pass whatever that job needs explicitly.

:::note
Don't confuse the session with the per-update `state` store from
[Extending Nestgram](/docs/extending): `@State()` lives for one update and is
discarded; `@Session()` is what persists between them.
:::

## Who shares a session — the key

Every session is stored under a key `defaultSessionKey` computes from the
update. A *conversation* is most precisely a user in a chat, so the default
scopes by **chat and user** — plus the forum topic and business connection when
present, and the receiving bot's name (outermost) in a multi-bot app. Parts are
slot-prefixed, so an absent middle part can never collide.

| Situation                  | What the key scopes to                                                  |
| -------------------------- | ----------------------------------------------------------------------- |
| **Group chat**             | Per `chat.id` · `from.id` — two members never share state.              |
| **1:1 chat**               | `chat.id === from.id`, so it collapses to per-user automatically.       |
| **Forum**                  | Adds the topic — the same user in two topics gets two sessions.         |
| **Business connection**    | Adds the connection id — a business chat is its own scope.              |
| **Callback query**         | Scoped by the message its button sits on, so it shares the message flow's session in that topic. |
| **Multi-bot app**          | Prefixed by `bot.name`, so the same user+chat on two bots never shares. |
| **No chat to scope to**    | The key resolves to `undefined`, and so does `@Session()`.              |

When a different scope is the right one, replace the key function. It receives
the `TelegramExecutionContext`, so you read `ctx.chat`, `ctx.from`, `ctx.kind`
off it:

:::code

```ts
import { SessionModule } from 'nestgram';

SessionModule.forRoot({
  // one shared session per chat — everyone in the group sees the same state
  key: (ctx) => (ctx.chat ? `chat:${ctx.chat.id}` : undefined),
});
```

:::

Return `undefined` to skip the session for an update. The default is exported as
`defaultSessionKey` if you'd rather wrap it than replace it.

## Stores

A store is the three-method `SessionStore` contract, and everything behind it is
swappable. (It's an alias for the shared `KeyValueStore` seam — the same one the
FSM persists through.)

```ts
interface SessionStore {
  get(key: string): Promise<unknown> | unknown;
  set(key: string, value: unknown): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}
```

| Store                 | Backed by                      | Survives restart | Across instances | TTL                            |
| --------------------- | ------------------------------ | ---------------- | ---------------- | ------------------------------ |
| `MemorySessionStore`  | a process-local `Map`          | no               | no (disjoint)    | optional, **ms**, sliding      |
| `RedisSessionStore`   | a Redis client you provide     | yes              | yes              | optional `ttlSeconds`, sliding |
| your own              | anything                       | up to you        | up to you        | up to you                      |

### Memory — the default

`MemorySessionStore` is a process-local map. Zero setup, ideal for development —
and honest about its limits: a restart wipes every session, and two bot
instances each keep their own disjoint memory. Fine for a single-instance bot;
not a persistence layer.

It takes an optional TTL in milliseconds — sliding, refreshed every time the
session is saved:

:::code

```ts
import { SessionModule, MemorySessionStore } from 'nestgram';

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

SessionModule.forRoot({
  store: new MemorySessionStore(THIRTY_MINUTES_MS),
});
```

:::

### Redis

`RedisSessionStore` persists sessions as JSON under a prefixed key
(`nestgram:session:` by default). You hand it the client — Nestgram doesn't
depend on any Redis library:

:::code[app.module.ts]{mark="12"}

```ts
import Redis from 'ioredis';
import { Module } from '@nestjs/common';
import { NestgramModule, SessionModule, RedisSessionStore } from 'nestgram';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
    SessionModule.forRoot({
      store: new RedisSessionStore(new Redis(process.env.REDIS_URL ?? ''), {
        ttlSeconds: 60 * 60 * 24 * 30, // expire after 30 idle days
      }),
    }),
  ],
})
export class AppModule {}
```

:::

The seam is deliberately small — the store accepts anything matching
`RedisLikeClient`:

```ts
interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    seconds: number,
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}
```

An **ioredis** client matches this shape directly, as above. **node-redis** (v4)
differs — its TTL form is `set(key, value, { EX: seconds })` and `get` can
return a `Buffer` — so wrap it in a small adapter exposing exactly these four
methods.

Two consequences of the JSON round-trip:

- The session must be JSON-serialisable: plain objects, arrays, primitives. A
  `Date`, a `Map` or a class instance won't survive the trip.
- A corrupt or foreign value at the key is treated as *no session* — `get`
  returns `undefined`, so you get `defaults()` again instead of the whole update
  failing on a parse error.

`ttlSeconds` is sliding too: re-applied on every save, so active conversations
stay alive while abandoned ones expire.

### Bring your own

Anything implementing the three-method `SessionStore` contract plugs in —
Postgres, Mongo, a file, whatever your app already operates. Methods may be sync
or async; `SessionService` awaits them either way.

## Configuring from DI

When the store needs configuration from the DI container — a Redis URL from
`ConfigService`, say — use `forRootAsync`, exactly like other Nest dynamic
modules:

:::code[app.module.ts]

```ts
import Redis from 'ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionModule, RedisSessionStore } from 'nestgram';

SessionModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    store: new RedisSessionStore(new Redis(config.getOrThrow('REDIS_URL'))),
  }),
});
```

:::

The factory returns the same `SessionOptions` object `forRoot` takes — `store`,
`key`, `defaults`.

## Concurrent updates don't race

Load → mutate → save isn't atomic on its own, so two updates for the **same
conversation** running at once could race on the session (last save wins). On a
single instance you don't have to think about it: the on-by-default
`QueuedUpdateSource` wraps the update source, and the `UpdateQueue` behind it
serialises a chat's updates — they run one at a time in arrival order — while
different chats still run in parallel.

So when a user fires two fast taps on an inline keyboard, the second handler runs
only after the first has loaded, mutated, and saved. The race window is closed.

The queue keys by **chat** (`defaultChatKey`), one step coarser than the
per-conversation session key on purpose: serializing the whole chat also covers
any per-chat shared state, and different users in a 1:1 chat collapse to the same
chat anyway. Tune it under `NestgramModule.forRoot({ updateQueue: { ... } })`.

:::caution
Two caveats. First, the queue is **per-process** — across multiple instances the
same conversation can still land on different workers; move the store to Redis
and put a shared queue in front (the distributed queue is on the roadmap).
Second, if you replace the queue's `key` with something coarser than a chat, or
set `updateQueue: false`, you opt back out of this guarantee.
:::

## Sessions and the FSM

If the state you're tracking is *which step of a flow the user is in*, don't
hand-roll it with flags in the session. [State machines](/docs/fsm) build on the
exact same plumbing — the same `KeyValueStore` contract and the same
per-conversation key — with `stateGroup`/`FsmState` predicates that route on the
current state. `FsmModule` takes its own `store` and `key` options; point both
modules at one store instance and sessions and FSM state share a persistence
backend.

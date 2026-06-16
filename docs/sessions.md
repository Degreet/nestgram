---
title: Sessions
description: Persist per-conversation state across updates with @Session() — an in-memory store by default, Redis when you scale.
sidebar:
  group: State & sessions
  order: 70
---

Handlers are stateless on purpose: an update arrives, the handler runs, and
nothing sticks around. The moment your bot needs memory — a cart, a counter,
a user's preferences — you need state that survives between updates and
belongs to the right conversation. That's a session.

:::mental
update -> load session -> handler mutates\* -> saved on success
:::

## Enable sessions

Import `SessionModule` once, alongside `NestgramModule`. Every option is
optional — with no arguments you get an in-memory store, the default
per-conversation key, and `{}` as the initial value.

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
brand-new session is `{}` — and the first `cart.items.push(...)` would land
on `undefined`.

:::note
Sessions are off until you import the module — there's no flag to flip.
`@Session()` then resolves to `undefined` rather than throwing, so a router
that uses sessions optionally still runs in an app that doesn't.
:::

## Reading and writing with `@Session()`

`@Session()` injects the session loaded for the current update. Type it with
your own interface and mutate it in place — there is no `save()` to call.

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
2. Mutating the injected object **is** the write API. After the handler returns successfully, Nestgram saves the object back to the store under the same key.
3. The type is an assertion, not a check — `@Session()` can't verify the store really holds a `CartSession`. Keep the interface and the `defaults()` that seeds it next to each other so they can't drift.

:::

Two details worth knowing precisely:

- **Loaded before matching.** The session is loaded before match predicates
  run, so the same data is readable in guards, interceptors and
  [custom predicates](/docs/custom-predicates) — not just the handler. (This
  is also what lets the [FSM](/docs/fsm) route on state.)
- **Saved only on success.** The save runs after the handler returns. If no
  route matched, or the handler threw, nothing is written.

One JavaScript reality check: reassigning the parameter (`cart = { items: [] }`)
changes a local variable, not the session. Mutate properties instead —
`cart.items = []` empties the cart, `cart = ...` does nothing.

:::caution
"Saved only on success" is as strong as your store makes it. The memory store
keeps the live object reference, so in-place mutations are visible immediately
— a handler that mutates and _then_ throws has already changed the stored
object. The Redis store's JSON round-trip hands each load a fresh copy, so
there a failed handler really does leave the stored session untouched. Don't
build on rollback-on-throw with the memory store.
:::

Under the hood the loaded session rides the per-update ambient context
(`AsyncLocalStorage`) — that's how `@Session()` and the after-handler save see
the same object without threading it through arguments. That context is
in-process: work you offload to a queue or worker (e.g. BullMQ) crosses a
process boundary and won't see the session — pass the data it needs
explicitly.

:::note
Don't confuse the session with the per-update `state` store from
[Extending Nestgram](/docs/extending): `state` lives for one update and is
discarded; the session is what persists between them.
:::

## Who shares a session — the key

Every session is stored under a key computed from the update. The default key
scopes by **chat and user** — plus the forum topic and business connection
when present. In practice:

- In a **group**, each member has their own session — two users in the same
  chat never share state.
- In a **1:1 chat**, `chat.id` equals `from.id`, so the key collapses to
  per-user automatically.
- In a **forum**, the same user in two topics gets two sessions — a flow in
  one topic never bleeds into another.
- A **callback query** is scoped by the message its button sits on, so a
  button-driven flow shares the session with the message flow in that topic.
- An update with **no chat to scope to** gets no session — the key resolves to
  `undefined`, and so does `@Session()`.

When a different scope is the right one, replace the key function:

:::code

```ts
SessionModule.forRoot({
  // one shared session per chat — everyone in the group sees the same state
  key: (ctx) => (ctx.chat ? `chat:${ctx.chat.id}` : undefined),
});
```

:::

Return `undefined` to skip the session for an update. The default is exported
as `defaultSessionKey` if you'd rather wrap it than replace it.

## Stores

A store is three methods, and everything behind them is swappable:

```ts
interface SessionStore {
  get(key: string): Promise<unknown> | unknown;
  set(key: string, value: unknown): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}
```

### Memory — the default

`MemorySessionStore` is a process-local map. Zero setup, ideal for
development — and honest about its limits: a restart wipes every session, and
two bot instances would each keep their own disjoint memory. Fine for a
single-instance bot; not a persistence layer.

It takes an optional TTL in milliseconds — sliding, refreshed every time the
session is saved:

:::code

```ts
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

An **ioredis** client matches this shape directly, as above. **node-redis**
(v4) differs — its TTL form is `set(key, value, { EX: seconds })` and `get`
can return a `Buffer` — so wrap it in a small adapter exposing exactly these
four methods.

Two consequences of the JSON round-trip:

- The session must be JSON-serialisable: plain objects, arrays, primitives. A
  `Date`, a `Map` or a class instance won't survive the trip.
- A corrupt or foreign value at the key is treated as _no session_ — you get
  `defaults()` again instead of the whole update failing on a parse error.

`ttlSeconds` is sliding too: re-applied on every save, so active conversations
stay alive while abandoned ones expire.

### Bring your own

Anything implementing the three-method `SessionStore` contract plugs in —
Postgres, Mongo, a file, whatever your app already operates. Methods may be
sync or async; the engine awaits them either way.

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

The factory returns the same options object `forRoot` takes — `store`, `key`,
`defaults`.

## Concurrent updates

Load → mutate → save isn't atomic on its own, so two updates for the **same
conversation** running at once could race on the session (last save wins).
That's exactly what the built-in [update queue](/docs/how-nestgram-works)
prevents: it serialises a chat's updates — they run one at a time in arrival
order — while different chats still run in parallel. So rapid taps on an inline
keyboard from one user are processed in order, and the race can't happen on a
single instance.

:::caution
Two caveats. First, the queue is per-process — across **multiple instances**
the same conversation can still land on different workers; move the store to
Redis and put a shared queue in front (the distributed `UpdateQueue` is on the
roadmap). Second, if you replace the queue's `key` with something coarser than
a chat, or set `updateQueue: false`, you opt back out of this guarantee.
:::

## Sessions and the FSM

If the state you're tracking is _which step of a flow the user is in_, don't
hand-roll it with flags in the session. [State machines](/docs/fsm) build on
the same storage — the same store contract and the same per-conversation key —
with predicates that route on the current state. `FsmModule` takes its own
`store` and `key` options; point both modules at one store instance and
sessions and FSM state share a persistence backend.

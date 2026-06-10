---
title: 'Conversations: the FSM'
description: Build multi-step dialogues with an aiogram-style finite state machine — state groups, state-routed handlers, and write-through transitions.
sidebar:
  label: Conversations (FSM)
  group: State & sessions
  order: 71
---

A single handler answers a single update. A registration flow needs more:
ask the name, wait, ask the age, wait, save. Telegram won't help you here —
every message arrives as a fresh, contextless update, and "which question is
this user answering?" is state you have to keep yourself.

Nestgram ships a finite state machine for exactly this (if you know
aiogram's FSM, you'll feel at home). A conversation is **in a state**; the
state narrows which handlers are allowed to fire; the handler stores the
answer and moves the conversation on.

:::mental
message -> state loaded -> @OnMessage(Reg.name)\* -> fsm.set(Reg.age)
:::

## Turn it on

Import `FsmModule` once, next to `NestgramModule`:

:::code[app.module.ts]{mark="11"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, FsmModule } from 'nestgram';
import { RegistrationRouter } from './registration.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
    FsmModule.forRoot(),
  ],
  providers: [RegistrationRouter],
})
export class AppModule {}
```

:::

With no options it keeps state in process memory — fine for development and
single-instance bots; [Where the state lives](#where-the-state-lives) covers
Redis. If you don't import `FsmModule` at all, FSM is off: state predicates
never match, and a transition throws instead of silently dropping a write.

## Define the states

`stateGroup()` declares the steps of a flow — a factory, symmetric with
`callbackData()` from [Callbacks](/docs/callbacks). Keep the shape of the
data the flow collects right beside it:

:::code[registration.states.ts]

```ts
import { stateGroup } from 'nestgram';

export const Reg = stateGroup('reg', ['name', 'age']);
// Reg.name.id === 'reg:name', Reg.age.id === 'reg:age'

export interface RegData {
  name: string;
}
```

:::

Each member (`Reg.name`) is an `FsmState` doing double duty. It is an
**identity** — `fsm.set(Reg.name)` enters it — and a **route predicate** —
`@OnMessage(Reg.name)` matches only while it's active. One definition, and
no `'reg:name'` strings anywhere in your handlers.

:::note
The stored id is `group:name`, so the group key (`'reg'`) is the namespace —
keep it unique per flow. And don't confuse `FsmState` with `@State()`: that
decorator injects the per-update scratch store from
[Extending Nestgram](/docs/extending), which lives for one update and has
nothing to do with conversations.
:::

## The wizard

A complete two-step registration — name, then age, with a `/cancel` escape:

:::code[registration.router.ts]

```ts
import {
  Router,
  Command,
  OnMessage,
  Message,
  Fsm,
  FsmContext,
  AnyState,
} from 'nestgram';
import { Reg, RegData } from './registration.states';

@Router()
export class RegistrationRouter {
  // Declared first: /cancel must win over the state steps below,
  // which would otherwise swallow it as plain input (first match wins).
  @Command('cancel')
  @AnyState()
  async cancel(message: Message, @Fsm() fsm: FsmContext) {
    await fsm.clear();
    return 'Cancelled.';
  }

  @Command('signup')
  async signup(message: Message, @Fsm() fsm: FsmContext<RegData>) {
    await fsm.set(Reg.name);
    return 'What should I call you?';
  }

  @OnMessage(Reg.name)
  async name(message: Message, @Fsm() fsm: FsmContext<RegData>) {
    if (!message.text) {
      return 'Text, please — what should I call you?';
    }
    await fsm.update({ name: message.text });
    await fsm.set(Reg.age);
    return `Nice to meet you, ${message.text}. How old are you?`;
  }

  @OnMessage(Reg.age)
  async age(message: Message, @Fsm() fsm: FsmContext<RegData>) {
    const age = Number(message.text);
    if (!Number.isInteger(age) || age <= 0) {
      return 'A number, please — how old are you?';
    }
    const { name } = fsm.data();
    await fsm.clear();
    return `Registered: ${name}, ${age}. Welcome aboard!`;
  }
}
```

:::

:::anno

1. `@OnMessage(Reg.name)` fires only while **that user's** conversation is in `reg:name`. The state ANDs with the update type — and with any other predicates you pass alongside it.
2. `@Fsm()` injects the `FsmContext`. Type the collected data via the annotation — `FsmContext<RegData>` — since a decorator argument can't set a parameter's type.
3. `fsm.update({ name })` merges an answer into the flow's data; `fsm.set(Reg.age)` moves on. `fsm.data()` is `Partial<RegData>`, because a flow fills its fields step by step.
4. `fsm.clear()` finishes: state and data are dropped and the record is deleted from the store — an idle conversation stores nothing.
5. `/cancel` is declared first. First match wins, and the `reg:name` step matches _any_ message — declared later, `/cancel` would be saved as somebody's name.

:::

A state step receives **any** message in that state — stickers and photos
included — which is why `name()` checks `message.text` before trusting it.
And notice what failed validation does in `age()`: it replies and _doesn't_
transition, so the user stays on the same step and tries again. That's the
whole retry mechanism — no special API.

## Transitions are write-through

`set`, `update`, `setData` and `clear` persist the moment their `await`
resolves — not at the end of the handler. If sending the reply afterwards
fails, the transition has still happened (aiogram behaves the same way). The
flip side of the same coin: there is no rollback-on-throw. A flow stuck by a
crash is exactly what the `@AnyState()` `/cancel` is for.

The context is also reachable outside handlers, as the `fsm()` free function
— the same ambient bargain as `t()` in [i18n](/docs/i18n), so a service deep in the call
chain can transition the current conversation without you threading a
context through every signature:

:::code[onboarding.service.ts]

```ts
import { Injectable } from '@nestjs/common';
import { fsm } from 'nestgram';
import { Reg } from './registration.states';

@Injectable()
export class OnboardingService {
  async begin() {
    await fsm().set(Reg.name); // the current update's conversation
  }
}
```

:::

:::caution
The ambient context rides on `AsyncLocalStorage`, which is in-process. Work
you offload to a queue worker (BullMQ and friends) crosses a process
boundary — `fsm()` won't see the conversation there. Pass what you need
explicitly, or do the transition before enqueueing.
:::

Reads degrade gracefully when FSM is unavailable — `fsm().current()` returns
`null` and `fsm().data()` returns `{}` — but a transition throws, because a
silently dropped `set` is a debugging trap. "Unavailable" means `FsmModule`
isn't imported, or the update has no chat to scope a conversation to.

## Idle or busy: @AnyState() and @NoState()

Two method-level modifiers cover the meta-conditions: `@AnyState()` fires
only while _some_ flow is active — the `/cancel` above works from any step
of any flow — and `@NoState()` only while idle. The classic use for
`@NoState()` is a catch-all that must not steal a wizard step's input:

```ts
@OnMessage()
@NoState()
echo(message: Message) {
  return message.text; // never runs mid-wizard
}
```

:::guardrail[only in Nestgram]
Both are one-liners over the public `@Match()` primitive, which ANDs a
predicate into every route a method declares. Nothing privileged: the same
`@Match` is yours for [custom predicates](/docs/custom-predicates), and you
could rebuild `@AnyState()` yourself in three lines.
:::

## Where the state lives

Persistence is a `KeyValueStore` — three methods (`get`/`set`/`delete`),
shared with [sessions](/docs/sessions). The default is an in-process
`MemoryStore`: state evaporates on restart and isn't shared between
instances, which is fine in development and honest about what it is. For
production, hand `FsmModule` the Redis-backed store (named for sessions,
but it's just a `KeyValueStore`):

:::code[app.module.ts]

```ts
import { FsmModule, RedisSessionStore } from 'nestgram';
import Redis from 'ioredis';

FsmModule.forRoot({
  // replaces the store's default 'nestgram:session:' prefix,
  // so FSM keys read nestgram:fsm:… instead of nestgram:session:fsm:…
  store: new RedisSessionStore(new Redis(), { prefix: 'nestgram:' }),
});
```

:::

FSM records are namespaced `fsm:` inside the store, so pointing sessions and
FSM at **one store instance** is safe — the two never collide. They stay
separate facilities on purpose: a session is long-lived per-user data, FSM
state is a position in a short dialogue plus its scratch answers. Finishing
a flow shouldn't wipe a user's settings.

By default a "conversation" is scoped per **chat + user** (plus the forum
topic and business connection when present): in a 1:1 chat that collapses to
per-user, and in a group every member walks their own wizard independently.
Override the `key` option to change that — return `undefined` to skip FSM
for an update entirely:

```ts
FsmModule.forRoot({
  // one flow per chat — everyone in a group advances the same wizard
  key: (ctx) => (ctx.chat ? `chat:${ctx.chat.id}` : undefined),
});
```

:::note
Need the store built from DI — say, a Redis client out of `ConfigService`?
`FsmModule.forRootAsync({ useFactory, inject })` works exactly like other
Nest dynamic modules.
:::

## Honest limits

Two things this layer does not do yet, so you can plan around them:

:::caution
**No scenes layer yet.** Wiring steps by hand — explicit `set` calls, one
handler per state — is the whole API today. It's transparent, but verbose
for long flows; a higher-level scenes/wizard layer on top of this core is
the next item on the roadmap.
:::

:::caution
**No per-conversation locking.** With long polling, updates are processed
one at a time, so a user can't race their own flow. The webhook source
handles updates concurrently — two rapid-fire messages from one user can
interleave, and the last write wins. Keep wizard handlers fast, and don't
park slow I/O between reading the state and transitioning it.
:::

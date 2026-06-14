---
title: Scenes (wizards)
description: Multi-step dialogues as ordered steps — @Scene / @Step / @OnEnter, a scene context with next/back/goto, ephemeral data, and a sub-dialog stack.
sidebar:
  label: Scenes (wizards)
  group: State & sessions
  order: 72
---

The [FSM](/docs/fsm) gives you the machinery for a multi-step dialogue: a
conversation is in a state, the state narrows which handler fires, and you
`set` the next state by hand. That's transparent — and verbose. A long flow
becomes a wall of `stateGroup` members, one `@OnMessage(State)` per step, and
an explicit `fsm.set(...)` at the end of every handler.

A **scene** is that same machine with structure on top. You declare an ordered
list of steps; the engine numbers them and routes each update to the current
one; you move with `next`, `back` or `goto` instead of naming a state. It
**compiles down to the FSM core** — no new engine, no parallel pipeline — and
adds four things the bare FSM makes you build yourself:

- **Ordered steps.** Declaration order is the order; `scene.next()` advances by
  one. No state names, no hand-wired transitions.
- **Lifecycle prompts.** `@OnEnter` shows the first question; `@OnLeave` runs
  cleanup. Neither is triggered by an update.
- **Ephemeral data.** Each scene has its own scratch object, **wiped on
  `leave`** — distinct from the long-lived session.
- **A stack.** `enter` pushes a sub-dialog; `leave` pops back to the caller,
  right where it paused.

:::mental
update -> scene loaded -> @Step()\* -> scene.next('…')
:::

If you've used aiogram's scenes (or telegraf's `WizardScene`), this is the same
shape, expressed in Nest's vocabulary: a scene **is a router**, a step **is a
handler**, the step's gate **is a `@Match` predicate**.

## Turn it on

Import `ScenesModule` once, alongside `NestgramModule`, and list your scene
classes in `providers` like any router:

:::code[app.module.ts]{mark="11"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, ScenesModule } from 'nestgram';
import { RegistrationScene } from './registration.scene';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
    ScenesModule.forRoot(),
  ],
  providers: [RegistrationScene],
})
export class AppModule {}
```

:::

With no options it keeps scene state in process memory — fine for development
and single-instance bots; [Setup](#setup-and-the-gates) covers Redis and the
store it shares with sessions and the FSM. If you don't import `ScenesModule`,
scenes are off: step predicates never match, and a `scene.enter(...)` throws
rather than silently dropping.

## A registration wizard

Three questions — name, age, email — entered from a normal router. The scene is
just a class; each `@Step()` is a method, gated to "this scene is active AND
this is its current step":

:::code[registration.scene.ts]

```ts
import {
  Scene,
  Step,
  OnEnter,
  OnLeave,
  SceneCtx,
  SceneContext,
  OnText,
  OnEmail,
  Message,
} from 'nestgram';

export interface RegData {
  name: string;
  age: string;
  email: string;
}

@Scene('registration')
export class RegistrationScene {
  @OnEnter()
  start() {
    return 'What is your name?';
  }

  @Step()
  @OnText()
  async name(message: Message, @SceneCtx() scene: SceneContext<RegData>) {
    await scene.update({ name: message.text });
    return scene.next('How old are you?');
  }

  @Step({ invalid: 'Please send your age as text.' })
  @OnText()
  async age(message: Message, @SceneCtx() scene: SceneContext<RegData>) {
    await scene.update({ age: message.text });
    return scene.next('And your email?');
  }

  @Step({ invalid: "That doesn't look like an email — try again." })
  @OnEmail()
  async email(message: Message, @SceneCtx() scene: SceneContext<RegData>) {
    await scene.update({ email: message.text });
    const { name, age } = scene.data();
    return scene.leave(`Done, ${name} (${age})!`);
  }

  @OnLeave()
  async cleanup() {
    // side effects only — persist the result, clear a keyboard, …
  }
}
```

:::

:::anno

1. `@OnEnter` runs on entry, not on an update — its returned string is the first prompt. `@OnLeave` runs as the scene ends; its return value is ignored (the closing reply is the argument to `scene.leave(...)`).
2. `@Step()` methods are numbered by **declaration order** — `name` is step 0, `age` step 1, `email` step 2. No state names anywhere.
3. `@SceneCtx()` injects the `SceneContext`. Type the collected data via the annotation — `SceneContext<RegData>` — since a decorator argument can't set the parameter's type.
4. `scene.update({ … })` merges an answer into the scene's data; `scene.next('…')` advances one step and replies the prompt. `scene.data()` is `Partial<RegData>`, because a scene fills its fields step by step.
5. `scene.leave('…')` ends the scene: `@OnLeave` runs, the data is wiped, the closing reply is sent.

:::

Enter it from any normal router by handing `scene.enter` the scene **class** —
the same `@SceneCtx()` works there too. `enter` resolves to the scene's
`@OnEnter` reply, so returning it shows the first prompt:

:::code[entry.router.ts]{mark="9"}

```ts
import { Router, Command, Message, SceneCtx, SceneContext } from 'nestgram';
import { RegistrationScene } from './registration.scene';

@Router()
export class EntryRouter {
  @Command('register')
  register(message: Message, @SceneCtx() scene: SceneContext) {
    return scene.enter(RegistrationScene); // shows 'What is your name?'
  }
}
```

:::

That's the whole loop: `/register` enters, each text reply advances a step, the
last step leaves. Notice what's **not** there — no `if` deciding which question
this is, no state strings, no manual `set`. The step you're on decides which
method runs.

## Steps and lifecycle

A `@Step()` composes with the [`@On*` filter family](/docs/update-types):
`@Step() @OnText()` is a step that fires only on a text message while the scene
sits on it, `@Step() @OnPhoto()` only on a photo, `@Step() @OnCallbackQuery()`
(or `@Action(...)`) on a button tap. The filter is the step's input contract;
the scene+ordinal gate ANDs onto it. Put `@Step()` **above** its filter.

:::note
Order matters here: `@Step()` must sit **above** the `@On*` it guards. Decorators
evaluate bottom-up — the filter records what kinds it listens to first, then
`@Step()` reads that to wire the gate (and the reprompt). Reverse them and
`@Step({ invalid })` has nothing to reprompt against, and throws at boot.
:::

When the filter **rejects** an update — the user sent a photo where the step
wanted text — the default is to do nothing: the user stays on the step and can
try again. Pass `invalid` to reply a reprompt instead, gated to the same step
but kind-aware, so a text step reprompts on a non-text message and a
callback step reprompts on a non-matching tap:

:::code[age.step.ts]

```ts
@Step({ invalid: 'Please send your age as text.' })
@OnText()
async age(message: Message, @SceneCtx() scene: SceneContext<RegData>) {
  await scene.update({ age: message.text });
  return scene.next('And your email?');
}
```

:::

:::tip
This mirrors the FSM's retry mechanism — validation that fails just doesn't
transition, so the user stays put — but you don't write the `if` yourself.
The filter **is** the validation, and `invalid` is the retry message.
:::

## The SceneContext API

`@SceneCtx()` (and the `scene()` free function) hands you a
`SceneContext<TData>`. Navigation and data writes are **write-through**: they
persist the moment their `await` resolves — the same bargain as `FsmContext`, so
a move survives a later send failure in the same handler. The navigation methods
resolve to their `reply` argument, so a handler ends with
`return scene.next('…')` and the [return-value contract](/docs/routers) replies it.

| Method                       | Returns                | What it does                                                                                                       |
| ---------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `current()`                  | `{ scene, step }`/`null` | The active scene id + step ordinal, or `null` when no scene is running.                                            |
| `data()`                     | `Partial<TData>`       | The data gathered so far — partial, since a scene fills it step by step.                                           |
| `update(patch)`              | `Promise<void>`        | Merge a patch into the active scene's data.                                                                        |
| `setData(data)`              | `Promise<void>`        | Replace the active scene's data wholesale.                                                                         |
| `next(reply?)`               | `Promise<string\|void>` | Advance one step (clamped to the last); resolves to `reply`.                                                      |
| `back(reply?)`               | `Promise<string\|void>` | Go back one step (never before the first); resolves to `reply`.                                                  |
| `goto(step, reply?)`         | `Promise<string\|void>` | Jump to a step by **ordinal** or **step-method name**; resolves to `reply`.                                       |
| `enter(scene, data?)`        | `Promise<string\|void>` | Enter a (sub-)scene — push the current one, run the new scene's `@OnEnter`, resolve to its prompt.               |
| `leave(reply?)`              | `Promise<string\|void>` | Leave the active scene — run `@OnLeave`, wipe its data, pop a parent if one is stacked; resolves to `reply`.     |

A few precise notes:

- **`goto` takes a name or an ordinal.** `scene.goto('email')` jumps to the
  step method named `email`; `scene.goto(2)` to ordinal 2. An out-of-range
  ordinal **throws** — it isn't silently clamped, because a typo'd jump is a bug,
  not a no-op. `next`/`back` _are_ clamped: `back` on the first step stays put,
  `next` on the last step stays put.
- **`enter` seeds data.** `scene.enter(SubScene, { from: 'menu' })` starts the
  sub-scene with that ephemeral data already in place.
- **The data is yours.** `TData` is whatever the scene collects; the framework
  reserves no fields. Type it via the `@SceneCtx() scene: SceneContext<RegData>`
  annotation and keep the interface beside the scene.

:::caution
`current()` and `data()` degrade gracefully when scenes are off or the update
has no chat — they return `null` and `{}`. But a **transition** (`next`,
`leave`, `update`, …) throws in that case, because a silently dropped move is a
debugging trap. "Off" means `ScenesModule` isn't imported, or the update has no
chat to scope to.
:::

## The scene stack

`enter` doesn't only start a scene from idle — called **from inside** a scene it
pushes the current one onto a stack and runs the new one as a sub-dialog. When
that sub-dialog calls `leave`, the parent **pops back** into place, resumed at
the step _after_ the one that spawned it. Ask a question mid-flow without losing
your place:

:::code[order.scene.ts]

```ts
@Scene('order')
export class OrderScene {
  @OnEnter()
  start() {
    return 'What are you ordering?';
  }

  @Step()
  @OnText()
  async item(message: Message, @SceneCtx() scene: SceneContext) {
    await scene.update({ item: message.text });
    return scene.enter(AddressScene); // push: ask for the address
  }

  @Step()
  @OnText()
  async confirm(message: Message, @SceneCtx() scene: SceneContext) {
    // Runs only after AddressScene popped back and advanced this scene.
    return scene.leave('Order placed!');
  }
}
```

:::

The sub-dialog's own data is independent and **wiped when it leaves** — only the
parent's data survives the pop. That's the heart of the three-tier model: a
scene's data is the shortest-lived state in the bot.

| State           | Scope                         | Lifetime                                                  |
| --------------- | ----------------------------- | --------------------------------------------------------- |
| **Session**     | per conversation              | Persists indefinitely (until you delete it).              |
| **FSM data**    | per conversation              | Lives while a flow runs; dropped on `fsm.clear()`.        |
| **Scene data**  | per active scene on the stack | Lives while that scene is active; **wiped on `leave`**.   |

A session is a user's long-lived memory (their cart, their settings); scene data
is the scratch pad for the dialogue happening right now. Finishing a wizard
shouldn't wipe a user's preferences — keep the durable bits in the
[session](/docs/sessions) and read them from the scene as needed.

## Setup and the gates

`ScenesModule.forRoot({ store })` takes the same `KeyValueStore` as
[sessions](/docs/sessions) and the [FSM](/docs/fsm) — three methods
(`get`/`set`/`delete`). The default is an in-process `MemoryStore`; point it at
a Redis-backed store to persist and share across instances. Scene records are
namespaced inside the store, so handing all three facilities **one store
instance** is safe — they never collide:

:::code[app.module.ts]

```ts
import { ScenesModule, RedisSessionStore } from 'nestgram';
import Redis from 'ioredis';

ScenesModule.forRoot({
  store: new RedisSessionStore(new Redis(), { prefix: 'nestgram:' }),
});
```

:::

The conversation key is the same `defaultConversationKey` sessions and the FSM
use — per **chat + user** (plus forum topic and business connection), so in a
group every member walks their own wizard. Override `key` to rescope, or return
`undefined` to skip scenes for an update:

```ts
ScenesModule.forRoot({
  // one wizard per chat — everyone in a group advances the same flow
  key: (ctx) => (ctx.chat ? `chat:${ctx.chat.id}` : undefined),
});
```

:::note
Need the store built from DI — a Redis client out of `ConfigService`?
`ScenesModule.forRootAsync({ imports, inject, useFactory })` works exactly like
the other dynamic modules; the factory returns the same `{ store, key }` options.
:::

### Capturing input: an active scene and @InScene()

While a scene is running it **captures input**. Only the scene's own `@Step()`
handlers are eligible to match — every other handler is suppressed for the
duration of the scene. That's the behavior you want by default: a catch-all
`@OnMessage()`, a stray `@Command`, an unrelated button handler can't steal a
step's input or fire mid-wizard. When no scene is active, routing is normal —
all handlers match, and the steps simply don't.

So a catch-all needs **no guard** to stay out of a wizard's way:

:::code[entry.router.ts]

```ts
@Router()
export class EntryRouter {
  @Command('register')
  register(message: Message, @SceneCtx() scene: SceneContext) {
    return scene.enter(RegistrationScene);
  }

  // No guard needed: while a scene runs this is suppressed automatically.
  @OnMessage()
  echo(message: Message) {
    return message.text;
  }
}
```

:::

To run a handler **mid-scene** — a global `/cancel` that bails out of any
wizard, say — opt it in with `@InScene()`. It marks the handler as exempt from
the capture, so it fires **both** while idle and while a scene is active (its
own `@Command`/`@OnMessage`/… filters still apply):

:::code[cancel.router.ts]

```ts
@Router()
export class EntryRouter {
  // Exempt from capture: fires mid-scene (and idle). Order doesn't matter —
  // capture is decided by the scene gate, not first-match position.
  @Command('cancel')
  @InScene()
  cancel(message: Message, @SceneCtx() scene: SceneContext) {
    return scene.leave('Cancelled.');
  }
}
```

:::

:::warn
An active scene captures **all** input, not just text — an unrelated inline
**button callback** is suppressed mid-scene too, unless its handler is marked
`@InScene()`. If a button outside the wizard must keep working while a scene
runs (a persistent menu, a cancel button), add `@InScene()` to its handler.
:::

:::note
Capture is **route-matching only**. It decides which handler an update reaches;
it does not turn off the Nest pipeline. Per-update interceptors and stages —
throttling, i18n, the session and scene stages themselves — still run for every
update, scene or no scene. Suppression simply means a non-exempt route does not
**match** while a scene is active.
:::

`@InScene()` is determinism-friendly: because capture is decided by the scene
gate (an idle predicate ANDed onto every non-step, non-exempt route at boot),
not by declaration order, a step always wins over a would-be catch-all
regardless of which router declares what first.

:::guardrail[only in Nestgram]
`@InScene()` is a one-liner over the public [`@Match()`](/docs/custom-predicates)
primitive — the same one `@Step()` uses to AND its scene+ordinal gate. The
marker is a no-op predicate the boot-time scene gate recognises; nothing
privileged, you could rebuild it in three lines.
:::

### Outside handlers

The context is also reachable as the `scene()` free function — the same ambient
bargain as `fsm()` and `t()` — so a service deep in the call chain can drive the
current update's scene without threading a context through every signature:

:::code[onboarding.service.ts]

```ts
import { Injectable } from '@nestjs/common';
import { scene } from 'nestgram';
import { RegistrationScene } from './registration.scene';

@Injectable()
export class OnboardingService {
  async begin() {
    return scene().enter(RegistrationScene); // the current update's conversation
  }
}
```

:::

:::caution
The ambient context rides on `AsyncLocalStorage`, which is in-process. Work you
offload to a queue worker (BullMQ and friends) crosses a process boundary —
`scene()` won't see the conversation there. And as with the FSM, there's no
per-conversation locking yet: under the webhook source two rapid-fire updates
for one conversation can interleave, last write wins. Keep step handlers fast.
:::

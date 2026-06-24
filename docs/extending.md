---
title: Extending Nestgram
description: No privileged core — write an outbound ApiInterceptor, decorate or replace the update source, swap a built-in, reach per-update state. Everything the framework does, you do at the same level.
sidebar:
  group: Concepts
  order: 121
---

Nestgram has no privileged core. The conveniences it ships — auto-answering
callback queries, applying a default `parse_mode`, throttling sends, queuing
updates — are not engine internals. They are ordinary providers wired through
the **same public seams you get**: `NestInterceptor`s on the inbound side,
`ApiInterceptor`s on the outbound side, and the `UpdateSourceFactory` for
ingestion. There is no method a built-in calls that your code can't.

So "the framework doesn't do X" is rarely a wall. You disable the built-in that
doesn't fit and register your own at the level it ran.

:::mental
your interceptor / source == the framework's interceptor / source
:::

## The four seams

| Seam                       | What you plug in                  | Wired via                                       |
| -------------------------- | --------------------------------- | ----------------------------------------------- |
| Outbound API calls         | an `ApiInterceptor`               | `apiInterceptors: [...]`                         |
| Update ingestion           | an `UpdateSource`                 | `source: (ctx) => …`                            |
| Inbound handler pipeline   | a Nest guard / interceptor / pipe | `@UseGuards(...)`, `@UseInterceptors(...)`       |
| Route selection            | a `RoutePredicate`                | passed to a listener — see [custom predicates](/docs/custom-predicates) |

The inbound pipeline is plain Nest — nothing Nestgram-specific to learn. This
page is about the two seams that are ours: the outbound `ApiInterceptor` onion
and the `UpdateSource` factory. Routing extension lives in
[custom predicates](/docs/custom-predicates).

## Write an outbound interceptor

Every call the bot makes — `sendMessage`, `answerCallbackQuery`, an edit — goes
out through `ApiPipeline`, which composes the registered `ApiInterceptor`s into a
Nest-style onion around the cold wire call. It is the `intercept(context, next)`
contract you already know from `NestInterceptor`, pointed at the send side
instead of the handler side.

The difference from an inbound interceptor: `context` is an `ApiExecutionContext`,
and its `getRequest()` returns the **mutable** outbound `ApiRequest` — `{ method,
payload, token }`. Rewriting the payload before it leaves is the whole point, so
unlike the read-only inbound context, this one hands you something you can write
to.

:::code[disclaimer.interceptor.ts]

```ts
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  ApiInterceptor,
  ApiExecutionContext,
  ApiCallHandler,
} from 'nestgram';

/** Appends a footer to every outgoing text send. */
@Injectable()
export class DisclaimerInterceptor implements ApiInterceptor {
  intercept(
    context: ApiExecutionContext,
    next: ApiCallHandler,
  ): Observable<unknown> {
    const { payload } = context.getRequest();
    if (typeof payload.text === 'string') {
      payload.text += '\n\nSent by a bot.';
    }
    return next.handle();
  }
}
```

:::

Register it by **class** — `apiInterceptors` takes `Type<ApiInterceptor>[]`, not
instances, so each interceptor is a real provider and can inject anything from
the container:

:::code[app.module.ts]

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

import { DisclaimerInterceptor } from './disclaimer.interceptor';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN!,
      polling: true,
      apiInterceptors: [DisclaimerInterceptor],
    }),
  ],
})
export class AppModule {}
```

:::

This is exactly how the built-in `DefaultParseModeInterceptor` works: it reads
`context.getRequest().payload`, sets `payload.parse_mode` when the call didn't,
and returns `next.handle()`. Your interceptor sits between the framework's
leading mutators and the throttler — the throttler stays innermost, closest to
the wire, so it reads the final `chat_id` after every mutator has run.

:::caution
`next.handle()` is the **cold** inner call — nothing is sent until it's
subscribed, and each subscription re-runs the whole serialize → fetch → parse.
That cold-ness is what lets `next.handle().pipe(retry(n))` re-fire only the call.
Emit exactly the one value from `next.handle()`; never multicast it
(`share`/`shareReplay`), and never return `EMPTY` or filter the call out.
:::

An `async intercept()` is supported directly — return `Promise<Observable>` and
`async intercept() { await x; return next.handle(); }` reads naturally; the
pipeline flattens it.

## Decorate or replace the update source

`polling: true` and `webhook: {...}` are not the only way updates can reach the
dispatcher. Both resolve to one small `UpdateSource` — `start(onUpdate)` /
`stop()` — and the `source` factory lets you wrap or replace it without touching
a single handler.

`BotSourceFactory` builds the transport the config describes, then hands it to
your factory as `ctx.default`. What you return is what the engine drives.

:::code[update-source.contract.ts]

```ts
import type { UpdateSource, UpdateListener, RawUpdate } from 'nestgram';

// The whole contract — delivery, nothing else.
export interface SketchSource extends UpdateSource {
  start(onUpdate: UpdateListener): Promise<void>; // begin delivering
  stop(): Promise<void>; //                          release the transport
}
// UpdateListener = (update: RawUpdate) => void | Promise<void>
```

:::

### Decorate — wrap the built-in source

Return a decorator that holds `ctx.default` and forwards `start`/`stop`,
intercepting each update on the way through. This is precisely what the
framework's own update queue is — a `QueuedUpdateSource` wrapping whatever the
seam produced.

:::code[logging.source.ts]

```ts
import type { UpdateSource, UpdateListener } from 'nestgram';

/** Holds the built-in source, traces each update, then forwards it. */
export class LoggingSource implements UpdateSource {
  constructor(private readonly inner: UpdateSource) {}

  start(onUpdate: UpdateListener): Promise<void> {
    return this.inner.start((update) => {
      console.log('update', update.update_id);
      return onUpdate(update);
    });
  }

  stop(): Promise<void> {
    return this.inner.stop();
  }
}
```

:::

:::code[app.module.ts]

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

import { LoggingSource } from './logging.source';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN!,
      polling: true,
      // ctx: { default, bot, get }. `default` is the transport the config built.
      source: ({ default: inner }) => new LoggingSource(inner!),
    }),
  ],
})
export class AppModule {}
```

:::

### Replace — own ingestion entirely

Ignore `ctx.default` and return your own `UpdateSource` to pull updates from
anywhere — a message queue, a custom transport, a test driver. The factory also
receives `ctx.get` to resolve dependencies from DI, and `ctx.bot` (the
`BotService` this source serves) so a multi-bot app can branch on
`ctx.bot.name`.

:::code[app.module.ts]

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

import { KafkaUpdateSource } from './kafka-update-source';
import { KafkaService } from './kafka.service';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN!,
      // No polling/webhook → ctx.default is undefined; you own delivery.
      source: ({ bot, get }) =>
        new KafkaUpdateSource(get(KafkaService), bot),
    }),
  ],
})
export class AppModule {}
```

:::

:::caution
Replacing a **webhook** source means you own delivery too. The ready-made
`WebhookController` delivers to the built-in source — which you replaced and the
engine never started — so leaving it registered silently drops updates. Drop the
controller and register your own receiver that forwards into your source.
:::

| You want to…                         | Return from `source`                          |
| ------------------------------------ | --------------------------------------------- |
| Add a layer (trace, batch, filter)   | a decorator holding `ctx.default`             |
| Pull from a different transport      | your own `UpdateSource`, ignoring `ctx.default` |
| Branch per bot in a multi-bot app    | inspect `ctx.bot.name`, then wrap or replace  |

Whatever the factory returns is still wrapped in the default update queue
(per-chat FIFO + bounded concurrency) unless you set `updateQueue: false`. The
queue wraps the seam's output, so a custom source is serialized too.

## Reach per-update state

Every update carries a `state` store you can write to in one stage of the
pipeline and read in another — a guard sets a flag, an interceptor or the handler
reads it. It's a plain `Map`, lives for that one update, then is discarded.
(State that must survive between updates is a [session](/docs/sessions).)

The handler reaches it with `@State()`; anywhere holding the execution context
(a guard, an interceptor) reaches it via `TelegramExecutionContext.of(host).state`.

:::code[admin.guard.ts]

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegramExecutionContext } from 'nestgram';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = TelegramExecutionContext.of(context);
    ctx.state.set('isAdmin', ctx.from?.id === Number(process.env.ADMIN_ID));
    return true; // a guard that annotates rather than rejects
  }
}
```

:::

:::code[panel.router.ts]

```ts
import { Router, OnMessage, State, Message, EventState } from 'nestgram';
import { UseGuards } from '@nestjs/common';

import { AdminGuard } from './admin.guard';

@Router()
export class PanelRouter {
  @UseGuards(AdminGuard)
  @OnMessage()
  handle(message: Message, @State() state: EventState) {
    return state.get('isAdmin') ? 'Welcome, admin.' : 'Members only.';
  }
}
```

:::

This same channel is how the built-in auto-answer works, with no special access:
`query.answer()` records into the per-update state, and the
`AutoAnswerCallbackInterceptor` reads `query.isAnswered` after the handler runs.
You could write that interceptor with the same public API.

## Swap a built-in

Because the built-ins are public interceptors, replacing one is "turn it off,
register yours."

| Built-in           | Turn it off with                              | Then add your own              |
| ------------------ | --------------------------------------------- | ------------------------------ |
| Auto-answer        | `autoAnswerCallbackQueries: false` (or `@NoAutoAnswer()` per handler) | a `NestInterceptor`            |
| Default parse mode | omit `parseMode`                              | an `ApiInterceptor`            |
| Throttler          | `throttle: false`                             | `throttler: MyThrottler`       |
| Update queue       | `updateQueue: false`                          | a wrapping `UpdateSource`      |

The `throttler` option is typed `Type<ApiInterceptor>` — your replacement is an
ordinary outbound interceptor, registered innermost where the default one ran.

:::guardrail[only in Nestgram]
Nothing here is a fork or a patch. The engine — discovery, the route table,
dispatch through `ExternalContextCreator` — is what you configure. Everything
layered on top of it (every built-in, your interceptors, your source) is a plugin
you own, written at the same level the framework wrote its own.
:::

## Multi-bot delivery is a seam too

When you run several bots (`bots: [...]`), inbound webhook routing is a public
controller, not engine magic. Two ready-made shapes ship in the barrel:

- **`MultiBotWebhookController`** routes by a `:botName` path segment — Telegram
  delivers to `POST /telegram/webhook/:botName`, and the controller verifies that
  bot's `secretToken` before delivering (unknown name → 404, bad secret → 403).
- **`SharedWebhookController`** serves every bot on one endpoint and routes by the
  per-bot secret token — the bot whose `secretToken` matches the incoming header
  gets the update. Give each bot a distinct secret for this to disambiguate.

Add the one you want to a module's `controllers`. Need a different base path or
routing rule? `createMultiBotWebhookController(path)` /
`createSharedWebhookController(path)` build the same controller at your path — or
write your own and forward updates into the matching `WebhookUpdateSource`.

:::tip
Testing an extension doesn't need a live bot. `NestgramTestbed` dispatches fake
updates against your routers through the same `ExternalContextCreator` the engine
uses — so your guard, interceptor, or predicate runs in the real pipeline,
network-free. See [testing](/docs/testing).
:::

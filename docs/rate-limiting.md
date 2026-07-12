---
title: Rate limiting
description: Cap how often a user or chat can trigger your handlers — an inbound flood guard via RateLimitModule, @RateLimit and @SkipRateLimit, with a silent drop or an onLimit reply.
sidebar:
  label: Rate limiting
  group: The Nest pipeline
  order: 61
---

[Send throttling](/docs/throttling) paces what your bot **sends**. Rate limiting
is the opposite end of the pipe: it caps what your bot **accepts** — how often a
single user or chat can trigger a handler. Someone hammering a command, a script
spamming a group: rate limiting drops the excess updates before they reach your
code, so an expensive handler (an LLM call, a DB write) runs at most `limit`
times per rolling window.

:::mental
update in → rate-limit gate (per user/chat) → within limit? handler runs : dropped
:::

It's off unless you import it — one module alongside `NestgramModule`.

## Turning it on

`RateLimitModule.forRoot` with a `default` rule applies to every route: at most
`limit` updates per rolling `windowMs`, scoped per user-per-chat.

:::code[app.module.ts]

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, RateLimitModule } from 'nestgram';
import { ChatRouter } from './chat.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
    RateLimitModule.forRoot({
      default: { limit: 5, windowMs: 10_000 }, // 5 updates / 10s per user
    }),
  ],
  providers: [ChatRouter],
})
export class AppModule {}
```

:::

Omit `default` to limit **only** the routes you decorate explicitly — the module
then does nothing until a `@RateLimit` opts a route in.

## Per-route rules

`@RateLimit(rule)` overrides the default for one handler, or for a whole
`@Router()` class. `@SkipRateLimit()` exempts a route entirely — it always wins.

:::code[chat.router.ts]

```ts
import { Router, Command, RateLimit, SkipRateLimit } from 'nestgram';
import type { Message } from 'nestgram';

@Router()
export class ChatRouter {
  // Expensive: tighten it well below the module default.
  @Command('ask')
  @RateLimit({ limit: 3, windowMs: 60_000 })
  ask(message: Message) {
    return 'thinking…';
  }

  // Cheap and always welcome — never limited.
  @Command('help')
  @SkipRateLimit()
  help(message: Message) {
    return 'here to help';
  }
}
```

:::

Resolution is nearest-wins: `@SkipRateLimit` first, then a handler `@RateLimit`,
then a class `@RateLimit`, then the module `default`. No rule anywhere → the
update passes through uncounted.

## What happens at the limit

Over the limit, the handler **never runs**. By default the update is dropped
silently — the flooder simply gets no response. Pass `onLimit` to answer instead:
whatever it returns flows through the normal [reply path](/docs/handling-errors),
so a `string` (or a `SendMessage`) becomes a "slow down" message. Return nothing
to stay silent for that call.

:::code[app.module.ts]

```ts
RateLimitModule.forRoot({
  default: {
    limit: 5,
    windowMs: 10_000,
    onLimit: () => '⏳ Too fast — give it a few seconds.',
  },
});
```

:::

:::note
Rate limiting is an **interceptor**, not a guard, on purpose. A guard returning
`false` makes Nest throw `ForbiddenException`, which hits your exception filters —
not a silent drop. The interceptor short-circuits cleanly: within limit it calls
the handler, over limit it emits the `onLimit` value or nothing at all.
:::

## What the counter is keyed on

Each rule counts against a **key**. The default is the conversation scope — bot ·
chat · user · forum topic · business connection — so one user flooding a group
doesn't limit everyone else, and the same user in two chats gets two budgets.

Override `key` to change the scope. Return `undefined` to skip an update (nothing
to scope it to):

:::code[app.module.ts]

```ts
RateLimitModule.forRoot({
  // One shared budget for the whole chat, regardless of who sends.
  default: {
    limit: 20,
    windowMs: 60_000,
    key: (ctx) => (ctx.chat ? `chat:${ctx.chat.id}` : undefined),
  },
});
```

:::

## Scaling out

The counters live in a process-local store by default. That's correct for a
single instance; bound its memory with `idleTtlMs` (evict a key idle at least
that long — set it **≥ your largest window**). Run more than one instance and the
per-process counters diverge, so give it a shared store — the same
[`KeyValueStore`](/docs/sessions) seam sessions use, backed by Redis. Resolve it
from config with `forRootAsync`:

:::code[app.module.ts]

```ts
import { RateLimitModule } from 'nestgram';
import { ConfigModule, ConfigService } from '@nestjs/config';

RateLimitModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    default: { limit: 5, windowMs: 10_000 },
    store: new RedisRateLimitStore(config.get('REDIS_URL')),
  }),
});
```

:::

## Options

| Option      | Applies to    | Effect                                                                     |
| ----------- | ------------- | -------------------------------------------------------------------------- |
| `default`   | module        | Fallback `{ limit, windowMs, key?, onLimit? }` for undecorated routes.     |
| `store`     | module        | Counter persistence. Default: in-memory; supply Redis to scale out.        |
| `idleTtlMs` | module        | Evict an idle in-memory key after this long. Must be ≥ the largest window. |
| `key`       | module / rule | Scope function. Default: the conversation key; `undefined` skips.          |
| `onLimit`   | module / rule | Called when an update is dropped; a returned value becomes the reply.      |
| `limit`     | rule          | Max updates allowed within the window.                                     |
| `windowMs`  | rule          | Rolling window length, in milliseconds.                                    |

`key` and `onLimit` set on a `@RateLimit` rule beat the module-level ones, which
beat the built-in defaults.

## Not a privileged core

`RateLimitModule` registers one public `APP_INTERCEPTOR` — the same kind of
interceptor you could write by hand, holding no reserved framework powers. Leave
the module out and rate limiting is simply absent; there is nothing to turn off.

---
title: Rate limiting (flood control)
description: Drop inbound floods before the handler runs — a per-conversation sliding-window limiter, with per-route overrides and a custom on-limit reply.
sidebar:
  label: Rate limiting
  group: The Nest pipeline
  order: 62
---

A single user hammering your bot — holding the send key, spamming a button,
running a script — shouldn't get every update handled. **Rate limiting** caps
how many updates one conversation may trigger in a window, and silently drops
the rest before your handler ever runs.

:::mental
update -> within limit? -> handler runs / dropped (no reply)
:::

This is **inbound** flood control: it protects _your_ handlers from too many
incoming updates. Don't confuse it with the **outbound** send throttle (the
built-in that paces your bot's calls to Telegram so _you_ don't hit the API's
send limits). They sit on opposite ends of the pipeline and solve opposite
problems — you can run both.

## Enable rate limiting

Import `RateLimitModule` once, alongside `NestgramModule`, with a default rule.
A rule is `{ limit, windowMs }`: at most `limit` updates per rolling `windowMs`
milliseconds, per conversation.

:::code[app.module.ts]{mark="11"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, RateLimitModule } from 'nestgram';
import { EchoRouter } from './echo.router';

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
  providers: [EchoRouter],
})
export class AppModule {}
```

:::

The window is a true **sliding window**: each slot frees exactly `windowMs`
after the hit that filled it, so there's none of a fixed window's
burst-at-the-boundary doubling.

:::note
Rate limiting is off until you import the module — there's no flag to flip.
With no `default` rule and no `@RateLimit` on a route, the limiter passes every
update straight through.
:::

## The scope: per user, per chat

By default a counter is keyed per **user, per chat** (plus forum topic and
business connection when present, and the receiving bot in a multi-bot app) —
the same `defaultConversationKey` that sessions and the FSM use. So one user
flooding a group never exhausts another user's budget, and the same user in two
different chats has two budgets.

Override the scope with a `key` function. Return a string to scope by it, or
`undefined` to skip the limiter for that update:

:::code[app.module.ts]

```ts
import { RateLimitModule } from 'nestgram';

// One shared budget for the whole chat (everyone in it counts together).
RateLimitModule.forRoot({
  default: {
    limit: 20,
    windowMs: 60_000,
    key: (ctx) => (ctx.chat ? `chat:${ctx.chat.id}` : undefined),
  },
});
```

:::

## Per-route overrides

`@RateLimit({...})` on a handler — or on a whole `@Router()` class — overrides
the module default for that route. A stricter limit on an expensive command, a
looser one elsewhere:

:::code[search.router.ts]{mark="6"}

```ts
import { Router, Command, Message, RateLimit } from 'nestgram';

@Router()
export class SearchRouter {
  @Command('search')
  @RateLimit({ limit: 2, windowMs: 30_000 }) // search is heavy: 2 / 30s
  search(message: Message) {
    return 'Searching…';
  }
}
```

:::

`@SkipRateLimit()` exempts a route entirely — handy for cheap, always-allowed
commands even under a strict module default:

:::code[help.router.ts]{mark="6"}

```ts
import { Router, Command, Message, SkipRateLimit } from 'nestgram';

@Router()
export class HelpRouter {
  @Command('help')
  @SkipRateLimit() // never limited
  help(message: Message) {
    return 'Here to help.';
  }
}
```

:::

Resolution is handler-over-class, and `@SkipRateLimit()` always wins: a method
marked skip is exempt even if its router class carries a `@RateLimit`.

## What happens on a drop

By default a dropped update is **silent** — the handler never runs and nothing
is sent back. To tell the user instead, give the rule an `onLimit` callback.
Return a value and it flows through the normal reply path, exactly like a
handler's return — a string, or a command object such as `SendMessage`:

:::code[app.module.ts]{mark="6"}

```ts
import { RateLimitModule } from 'nestgram';

RateLimitModule.forRoot({
  default: {
    limit: 5,
    windowMs: 10_000,
    onLimit: () => 'Slow down a moment ⏳',
  },
});
```

:::

`onLimit` may be async and receives the execution context, so the warning can
depend on who or where it is. Return `undefined` (or nothing) to fall back to
the silent drop. Like `key` and the rule itself, `onLimit` can be set on the
module default or per-route via `@RateLimit({ ..., onLimit })`.

:::tip
Sending a warning on _every_ dropped update can itself become spam (and burn
your send budget). A common pattern is to warn only on the first drop of a
burst, or to keep it silent and rely on the drop alone.
:::

## Where the counters live

By default the limiter counts in process memory. Each counter holds at most
`limit` timestamps, so a single key can't grow unbounded — but the number of
distinct keys does grow, one entry per conversation ever seen.

For a long-running, many-user bot, bound that with `idleTtlMs` — a key idle
longer than this is evicted:

:::code[app.module.ts]{mark="6"}

```ts
import { RateLimitModule } from 'nestgram';

RateLimitModule.forRoot({
  default: { limit: 5, windowMs: 10_000 },
  idleTtlMs: 60_000, // forget a conversation after 60s idle
});
```

:::

:::caution
Set `idleTtlMs` **≥ your largest window**. The expiry is sliding (every allowed
hit refreshes it), so an actively-hitting key never dies — but if `idleTtlMs`
were shorter than a window, a key still inside an active window could be evicted
and let a flood through. At or above the window it's lossless: by the time a key
is evicted its window has already emptied.
:::

For multiple instances, in-process counters don't add up — each replica limits
on its own slice of traffic. Supply a shared store instead. The limiter persists
through the same `KeyValueStore` contract sessions and the FSM use, so a
Redis-backed store makes one limit hold across the whole fleet (give its native
key TTL a value ≳ your largest window):

:::code[app.module.ts]

```ts
import { RateLimitModule } from 'nestgram';
import { myRedisStore } from './redis-store';

RateLimitModule.forRoot({
  default: { limit: 5, windowMs: 10_000 },
  store: myRedisStore, // any KeyValueStore — idleTtlMs is ignored, the store owns expiry
});
```

:::

:::note
Read-modify-write on the counter is not atomic — the same trade-off sessions and
the FSM already make. Under heavy concurrency a key can briefly exceed its limit
by the number of in-flight updates. That's fine for protective flood control,
and a non-issue for long polling, which processes a batch largely in order.
:::

## Configuring from DI

When the store or limits come from the DI container — a Redis client from
`ConfigService`, say — use `forRootAsync`, exactly like other Nest dynamic
modules:

:::code[app.module.ts]

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RateLimitModule } from 'nestgram';

RateLimitModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    default: {
      limit: config.get('RATE_LIMIT', 5),
      windowMs: 10_000,
    },
  }),
});
```

:::

## Not a privileged core

The limiter is just one public Nest interceptor, registered globally by the
module — the kind you could have written yourself. It runs _before_ your
handler; within the limit it calls the handler as normal, and over the limit it
short-circuits with the `onLimit` value or nothing at all.

It's deliberately an interceptor, not a guard: a guard returning `false` makes
Nest throw `ForbiddenException`, which is an error your filters would see — not
a clean, silent drop. The interceptor simply doesn't invoke the handler.

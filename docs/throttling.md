---
title: Send throttling (flood control)
description: The built-in send throttler — a global token bucket, a per-chat minimum interval, and a scope-aware 429 handler that honors retry_after. On by default; tune it with throttle, or replace it with throttler.
sidebar:
  label: Send throttling
  group: The Nest pipeline
  order: 62
---

Telegram rate-limits what your bot _sends_, not just what it receives. Exceed
roughly 30 messages a second globally, or send to the same chat faster than
about once a second, and you start collecting `429 Too Many Requests` with a
`retry_after`. The **send throttler** paces your outbound calls so you stay
under those limits, and absorbs the 429s you do hit — on by default, no wiring.

:::mental
your send -> per-chat gate -> global bucket -> Telegram (429? back off, retry)
:::

This is the **outbound** side: it shapes the bot's calls to the Bot API. Don't
conflate it with the **inbound** [update queue](/docs/how-nestgram-works), which
serializes _incoming_ updates per chat. They sit at opposite ends of the request
— one paces what you send, the other paces what you process — and both run by
default.

## How it gates a send

The throttler is the innermost interceptor in the [outbound API
pipeline](/docs/guards-and-pipeline) — `ThrottleInterceptor`, the last onion
layer before the call leaves for Telegram. Every send passes through two gates,
in order:

1. **The per-chat gate.** A `chat_id` send first acquires a per-chat slot — a
   minimum-interval limiter (default 1s between sends to one chat). Groups and
   channels additionally pass a `20 / 60s` token bucket. Acquired _before_ the
   global token, so a chat that's still cooling down doesn't burn a global token
   it can't yet use.
2. **The global token bucket.** One bucket shared across the whole bot
   (`30 / 1s` by default), refilling continuously so short bursts are allowed
   while the average rate holds.

Only then does the call go out. Both gates serialize their waiters in FIFO
order, so a chat's messages keep their send order even when several are queued
behind the limiter.

:::note
The throttler reads `chat_id` from the final payload, _after_ the mutating
interceptors (parse-mode, rich-messages, the file-id cache) have run. A send
without a `chat_id` skips the per-chat gate and only takes a global token.
:::

## Read calls pass through

Reads don't count against Telegram's send limits, so the throttler waves them
past untouched — they neither spend a global token nor stall behind a send-side
backoff. The pass-through is decided by the method name:

| Method group                                                                              | Throttled?                 |
| ----------------------------------------------------------------------------------------- | -------------------------- |
| Anything starting with `get*` (incl. `getUpdates`, `getMe`, `getFile`)                    | no — passes through        |
| `setWebhook`, `deleteWebhook`, `logOut`, `close`                                          | no — webhook/session admin |
| Everything else (`sendMessage`, `sendPhoto`, `editMessageText`, `answerCallbackQuery`, …) | yes                        |

This matters most for long polling: `getUpdates` runs through the same outbound
pipeline, and routing it through the throttler would burn your send budget and
couple the poll loop to a send-side 429 backoff. The policy lives on the
throttler itself — not as a flag on every method class — so it travels with the
component you can swap out.

## On a 429: scope-aware backoff

When a send comes back `429`, the throttler doesn't just bubble the error — it
reads the `retry_after` Telegram returned and waits it out, then retries the
same call, up to `maxRetries` times. The wait is `retry_after` plus a small
`retryBufferMs` cushion; a 429 that omits `retry_after` falls back to
`fallbackRetrySeconds`.

The clever part is _what_ it pauses, keyed on the 429's `scope`:

| 429 `scope`       | What backs off                                          |
| ----------------- | ------------------------------------------------------- |
| `global`          | the global bucket — the whole bot pauses for the window |
| per-chat / absent | only that chat's limiter — other chats keep flowing     |

So a global flood-wait stalls everything until it clears, while a per-chat
flood-wait quarantines just the offending chat. Every send already queued behind
the paused limiter inherits the backoff, instead of each rediscovering the 429
on its own.

If retries are exhausted — or you set `retry: false` — the `ApiException`
surfaces unchanged, so a handler-side [`@Catch` filter](/docs/handling-errors)
can react to it (`ApiException.is(error, 429)`, `error.parameters?.retry_after`)
like any other API failure.

## Tuning it

Pass an object to `throttle` to override any default. Telegram's limits are
unofficial and shift, so every knob is open:

:::code[app.module.ts]

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';
import { EchoRouter } from './echo.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
      throttle: {
        globalRate: 30,
        globalIntervalMs: 1000,
        perChatIntervalMs: 1000,
        maxRetries: 5,
      },
    }),
  ],
  providers: [EchoRouter],
})
export class AppModule {}
```

:::

The full knob set, with defaults:

| Knob                   | Default  | Effect                                                              |
| ---------------------- | -------- | ------------------------------------------------------------------- |
| `globalRate`           | `30`     | Global allowance: sends per `globalIntervalMs`.                     |
| `globalIntervalMs`     | `1000`   | The window the global bucket refills over.                          |
| `perChatIntervalMs`    | `1000`   | Minimum gap between two sends to the same chat.                     |
| `groupRate`            | `20`     | Group/channel allowance: sends per `groupIntervalMs`.               |
| `groupIntervalMs`      | `60000`  | The window the per-group bucket refills over.                       |
| `maxRetries`           | `3`      | How many times a 429 is retried before the `ApiException` surfaces. |
| `retry`                | `true`   | Retry 429s at all; `false` surfaces them immediately.               |
| `retryBufferMs`        | `250`    | Extra wait added on top of `retry_after` before retrying.           |
| `fallbackRetrySeconds` | `5`      | Wait used when a 429 omits `retry_after`.                           |
| `idleTtlMs`            | `300000` | Evict a per-chat limiter idle at least this long.                   |
| `maxKeys`              | `10000`  | Hard cap on tracked chats; LRU-evict past it.                       |
| `sweepIntervalMs`      | `60000`  | How often the idle sweeper runs.                                    |

:::note
The last three knobs bound memory, not rate. Per-chat limiters are created
lazily and an unref'd sweeper evicts the idle ones, so the chat map can't grow
without bound as new chats message a long-running bot.
:::

## Turning it off

`throttle: false` makes the interceptor a pure passthrough — it stays in the
pipeline but every call goes straight through. Reach for this only when
something upstream already paces your sends (your own queue, a gateway), since
without it nothing stands between your bot and a 429 storm.

:::code[app.module.ts]

```ts
import { NestgramModule } from 'nestgram';

NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  polling: true,
  throttle: false, // no pacing — you own send rate
});
```

:::

## Not a privileged core

The throttler is one public `ApiInterceptor`, the same contract your own
outbound interceptors implement — nothing the framework reserves for itself. Set
`throttler` to a class of your own and it takes the innermost slot instead of
the built-in:

:::code[app.module.ts]

```ts
import { NestgramModule } from 'nestgram';
import { DistributedThrottleInterceptor } from './distributed-throttle.interceptor';

NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  polling: true,
  throttler: DistributedThrottleInterceptor, // your interceptor, innermost slot
});
```

:::

This is the seam for the throttler's one real limitation: its buckets live **in
process**, so each replica paces against its own budget and `N` replicas can
collectively still exceed Telegram's limits. A Redis-backed `throttler` sharing
state across the fleet swaps in through exactly this interface — same `intercept`
contract, replacing the default rather than wrapping it.

:::tip
`throttle` tunes the built-in throttler; `throttler` _replaces_ it. Set
`throttler` and the `throttle` knobs no longer apply — your interceptor owns the
policy end to end.
:::

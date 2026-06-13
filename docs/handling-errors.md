---
title: Handling errors
description: React to Telegram API failures with typed ApiException predicates, and silence the edit no-op with ignoreNotModified.
sidebar:
  label: Handling errors
  group: The Nest pipeline
  order: 61
---

When Telegram **rejects an outbound call** (`ok: false`), Nestgram throws an
`ApiException` carrying the `error_code`, the `description`, any `parameters`
(like `retry_after`), and the request `body`. This is the send side — distinct
from an error thrown _inside_ a handler, which a standard
[exception filter](/docs/guards-and-pipeline) catches.

:::mental
Telegram rejects the call -> ApiException -> predicate -> react
:::

## The problem with `description`

Telegram has no structured error catalog. Many distinct failures share one
`error_code` — `400` alone covers dozens — and the only thing that tells them
apart is the human-readable `description`, whose exact wording Telegram controls
and the API spec doesn't model. Matching it by hand is brittle:

```ts
// Don't: the phrase is Telegram's to change, and this repeats in every bot.
if (
  error instanceof ApiException &&
  error.description.includes('not modified')
) {
}
```

## Typed predicates

`ApiException` carries static type-guards for the failures every bot meets. Each
narrows `unknown` to `ApiException`, so the caught error stays typed — and the
phrasing lives once, in the framework, not in your code:

:::code[broadcast.service.ts]{mark="7"}

```ts
import { ApiException, BotService } from 'nestgram';

async function notify(bot: BotService, chatId: number, text: string) {
  try {
    await bot.sendMessage(chatId, text);
  } catch (error) {
    if (ApiException.isBlockedByUser(error)) {
      // They blocked the bot — a send here can never succeed again.
      await pauseSubscription(chatId);
      return;
    }
    throw error; // anything else is a real failure — let it surface
  }
}
```

:::

The built-in predicates:

| Predicate                         | Matches                                |
| --------------------------------- | -------------------------------------- |
| `ApiException.isBlockedByUser(e)` | `403` · the user blocked the bot       |
| `ApiException.isNotModified(e)`   | `400` · an edit with identical content |
| `ApiException.isChatNotFound(e)`  | `400` · the target chat doesn't exist  |

### The generic escape hatch

For a code or phrasing not in the table, `is(error, code, pattern?)` matches an
`error_code`, optionally narrowed by a `description` pattern you supply:

```ts
if (ApiException.is(error, 403)) {
  // any forbidden — blocked, kicked, deactivated…
}
if (ApiException.is(error, 400, /not enough rights/i)) {
  // a specific 400 the catalog doesn't name yet
}
```

:::tip
An unmatched error stays a plain `ApiException` — the predicates never
misclassify, they just return `false`. Catch `ApiException` itself to handle
any API rejection uniformly.
:::

## `ignoreNotModified`: the edit no-op

Tapping a callback button twice re-sends an _identical_ edit, which Telegram
rejects with `400 message is not modified`. Every bot with inline-button UI hits
it, and the fix is always the same — ignore it. Rather than wrap every
`editText` in a `try/catch`, opt in once:

:::code[app.module.ts]{mark="9"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
      ignoreNotModified: true,
    }),
  ],
})
export class AppModule {}
```

:::

With it on, a "not modified" rejection becomes a successful no-op (the edit
methods already return `Message | true`, and you get `true`). It's an ordinary
opt-in API interceptor — off by default, because silently eating errors is
otherwise a footgun.

:::warn[Only the no-op is swallowed]
A genuinely **stale** edit — `message can't be edited` (older than 48h) or
`message to edit not found` (deleted) — still throws. Swallowing those would
hide a real bug: a UI editing dead messages.

> `ignoreNotModified` silences identical re-edits, never a failed edit

:::

If you'd rather handle it inline for one call, the predicate is the same hook
the interceptor uses:

```ts
try {
  await message.editText(next);
} catch (error) {
  if (ApiException.isNotModified(error)) return; // double-tap, ignore
  throw error;
}
```

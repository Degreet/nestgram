---
title: Handling errors
description: Reply by throwing a ReplyException, react to Telegram API failures with typed ApiException predicates, and silence the edit no-op with ignoreNotModified.
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

## Replying by throwing: `ReplyException`

The other side of error handling is the **handler side** — bailing out of a
request and telling the user why. Nest's idiom for this is `throw new
HttpException(...)`; Nestgram's is `throw new ReplyException(...)`. Throw it
anywhere in the pipeline — a guard, a pipe, an interceptor, or the handler — and
a built-in global exception filter sends the reply and stops the request. No
`return`, no threading a "denied" flag back to the handler.

:::mental
throw ReplyException -> filter catches -> reply sent -> request stops
:::

A guard is the natural home: deny **and** explain in one `throw`, instead of
returning `false` (which is silent) and explaining somewhere else.

:::code[admin.guard.ts]{mark="11"}

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ReplyException, TelegramExecutionContext } from 'nestgram';

const ADMIN_IDS = [42, 1337];

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { from } = TelegramExecutionContext.of(context);
    if (from && ADMIN_IDS.includes(from.id)) {
      return true;
    }
    throw new ReplyException('Only admins can do that.');
  }
}
```

:::

The handler never runs; the user gets the message. The same `throw` works for
handler-level validation — guard clauses read top-to-bottom instead of nesting:

:::code[rename.router.ts]{mark="9"}

```ts
import { Command } from 'nestgram';
import { Message, ReplyException } from 'nestgram';

@Router()
export class RenameRouter {
  @Command('rename')
  rename(message: Message): string {
    const name = message.text?.split(' ').slice(1).join(' ').trim();
    if (!name) {
      throw new ReplyException('Usage: /rename <new name>');
    }
    return `Renamed to ${name}.`;
  }
}
```

The reply mirrors a handler's [return value](/docs/replying) exactly: a string
replies to the same chat, and a command object goes out as-is. Pass reply
options after the text, or hand it a ready-made command:

```ts
// Text with reply options (a keyboard, a reply target…):
throw new ReplyException('Pick one:', { reply_markup: keyboard });

// A full command object — the layer beneath `message.answer(...)`:
throw new ReplyException(new SendMessage({ chat_id, text: 'Done.' }));
```

### Answering a callback query

For a button tap, the right reaction is a toast or modal alert, not a chat
message. `AnswerException` answers the originating callback query — it shares the
same base as `ReplyException`, so the same filter catches it:

```ts
// A toast on the button:
throw new AnswerException('Too fast — slow down.');

// A modal alert:
throw new AnswerException('Not allowed', { show_alert: true });
```

Thrown on a non-callback update, it has no callback to answer, so the filter logs
a warning and does nothing.

:::note[It's a plain `@Catch` filter — no privileged core]
`ReplyException` handling is just a global `@Catch(ReplyExceptionBase)` filter
`NestgramModule` registers — exactly the kind you could write yourself. Define
your own domain exceptions and `@Catch(MyError)` filters the same way; they run
in the same Nest pipeline, ahead of the framework's own error logging.
:::

### Sharing a service with HTTP

`ReplyException` lives on the **Telegram layer** — throw it from a handler,
guard, or interceptor, just as you'd throw `HttpException` from a controller.
Don't throw it from a domain service you also call over HTTP: that service
shouldn't know the shape of a Telegram reply.

Instead, throw a plain **domain error** and let each transport map it. It's
**one `@Catch` filter per transport, not one per error** — and because the
filter holds the context, it picks the right reaction by update kind:

:::code[telegram-error.filter.ts]

```ts
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import {
  CallbackQuery,
  Message,
  TelegramExecutionContext,
  UpdateKind,
} from 'nestgram';

// Domain layer — transport-agnostic, reused over HTTP and Telegram:
export abstract class AppError extends Error {}
export class InsufficientFundsError extends AppError {
  constructor(readonly shortBy: number) {
    super(`Not enough funds — short by ${shortBy}.`);
  }
}

// Telegram adapter — ONE filter for the whole AppError family:
@Catch(AppError)
export class TelegramErrorFilter implements ExceptionFilter {
  async catch(error: AppError, host: ArgumentsHost): Promise<void> {
    const ctx = TelegramExecutionContext.of(host);
    if (ctx.kind === UpdateKind.CallbackQuery) {
      await (ctx.event as CallbackQuery).alert(error.message);
    } else {
      await (ctx.event as Message).answer(error.message);
    }
  }
}
```

:::

The HTTP side registers its own `@Catch(AppError)` filter mapping the same error
to, say, a `409` — the service stays oblivious to both. The trade-off is
fundamental, and you pick per case: a `ReplyException` **knows** its presentation
(zero filters, but Telegram-coupled), a domain error **doesn't** (reusable across
transports, at the cost of one filter). A Telegram-only bot wants `ReplyException`
and no filters at all.

It pairs naturally with [rate limiting](/docs/rate-limiting): an `onLimit`
callback can `throw new ReplyException('Slow down.')` to warn the flooder instead
of dropping their update silently.

To turn the built-in off — and let `ReplyException`/`AnswerException` propagate
like any other error — set `replyExceptions: false` on `NestgramModule.forRoot`:

:::code[app.module.ts]{mark="8"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      replyExceptions: false,
    }),
  ],
})
export class AppModule {}
```

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

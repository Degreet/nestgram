---
title: Update types
description: The full @On* catalog, and handling several update types in one method by stacking decorators.
sidebar:
  group: Routing
  order: 22
---

Telegram sends many kinds of update — messages, edits, callback queries, chat
member changes, polls, and more. Each has a matching `@On*` decorator that
routes that kind to a handler.

## The @On\* catalog

Every handler's first parameter is the concrete event type for that update kind:

| Decorator                               | Event                 | Fires on               |
| --------------------------------------- | --------------------- | ---------------------- |
| `@OnMessage()`                          | `Message`             | a new message          |
| `@OnEditedMessage()`                    | `Message`             | a message was edited   |
| `@OnChannelPost()`                      | `Message`             | a channel post         |
| `@OnCallbackQuery()`                    | `CallbackQuery`       | an inline button press |
| `@OnInlineQuery()`                      | `InlineQuery`         | an inline-mode query   |
| `@OnPoll()` / `@OnPollAnswer()`         | `Poll` / `PollAnswer` | poll updates           |
| `@OnMyChatMember()` / `@OnChatMember()` | `ChatMemberUpdated`   | membership changes     |
| `@OnChatJoinRequest()`                  | `ChatJoinRequest`     | a join request         |

:::note
This is the high-level list. The full set mirrors the Bot API's update fields
(business messages, reactions, chat boosts, pre-checkout, shipping, …). If
Telegram has an update field, Nestgram has an `@On*` for it.
:::

## Several types, one handler

Usually you write one handler per type and share a private method. When a single
method genuinely fits several types, **stack the decorators** — each one binds
the method to its update type. The parameter becomes a union, and you narrow it
with a plain `instanceof` (events are real classes).

:::code[feedback.router.ts]{mark="11-12"}

```ts
import {
  Router,
  OnMessage,
  OnCallbackQuery,
  Message,
  CallbackQuery,
} from 'nestgram';

@Router()
export class FeedbackRouter {
  @OnMessage()
  @OnCallbackQuery()
  handle(event: Message | CallbackQuery) {
    if (event instanceof Message) {
      // narrowed to Message here
      return event.answer(`You said: ${event.text}`);
    }
    // narrowed to CallbackQuery here
    return event.answer('Got it');
  }
}
```

:::

:::anno

1. Stacking `@OnMessage()` and `@OnCallbackQuery()` binds one method to both update types — no special union decorator needed.
2. The parameter is a **union** of the matching event types — no hidden optionals.
3. `instanceof Message` narrows the union, so you only reach type-specific fields after a conscious check — standard TypeScript, no framework-specific API.

:::

:::tip
Prefer separate handlers calling a shared method — it keeps each handler's type
exact. Reach for stacked decorators only when the branching genuinely belongs in
one place.
:::

## allowed_updates: what Telegram actually sends

Telegram only delivers the update kinds a bot asks for — and a few kinds are
**held back unless requested by name**: `chat_member`, `message_reaction`, and
`message_reaction_count`. This is a classic production footgun: with most bot
libraries, an `@OnChatMember()` handler compiles, deploys, and then never fires
— no error anywhere, Telegram just doesn't send the update.

Nestgram closes it for you. At startup the framework **derives `allowed_updates`
from your handlers**: every update kind some `@On*` decorator listens to is
requested — for `getUpdates` in polling mode and in the `setWebhook`
registration in webhook mode. Write `@OnChatMember()` and `chat_member` updates
arrive; nothing to configure.

If you need manual control, pass an explicit list — it wins over the derived
one:

:::code[app.module.ts]

```ts
NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  polling: { allowed_updates: ['message', 'callback_query'] },
  // webhook mode: webhook: { url, secretToken, allowedUpdates: [...] }
});
```

:::

With an explicit list, any handler listening to a kind the list omits is dead
code — Telegram will never deliver it. Nestgram warns about every such handler
at startup, naming the router and method, so the mistake is one log line instead
of a production mystery.

:::note
The derived list contains exactly the kinds your handlers listen to — so a
custom `@UpdateStage` (which runs for every _delivered_ update) only sees those
kinds too. If a stage needs updates no handler routes, pass an explicit list.
An empty list (`allowed_updates: []`) means Telegram's _default_ set —
everything except `chat_member`, `message_reaction` and
`message_reaction_count` — not "nothing".

:::

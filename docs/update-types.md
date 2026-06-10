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

:::code[feedback.router.ts]

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

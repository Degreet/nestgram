---
title: Update types
description: The full @On* catalog, and handling several update types in one method with @On.
sidebar:
  group: Routing
  order: 22
---

Telegram sends many kinds of update — messages, edits, callback queries, chat
member changes, polls, and more. Each has a matching `@On*` decorator that
routes that kind to a handler.

## The @On* catalog

Every handler's first parameter is the concrete event type for that update kind:

| Decorator | Event | Fires on |
| --- | --- | --- |
| `@OnMessage()` | `Message` | a new message |
| `@OnEditedMessage()` | `Message` | a message was edited |
| `@OnChannelPost()` | `Message` | a channel post |
| `@OnCallbackQuery()` | `CallbackQuery` | an inline button press |
| `@OnInlineQuery()` | `InlineQuery` | an inline-mode query |
| `@OnPoll()` / `@OnPollAnswer()` | `Poll` / `PollAnswer` | poll updates |
| `@OnMyChatMember()` / `@OnChatMember()` | `ChatMemberUpdated` | membership changes |
| `@OnChatJoinRequest()` | `ChatJoinRequest` | a join request |

:::note
This is the high-level list. The full set mirrors the Bot API's update fields
(business messages, reactions, chat boosts, pre-checkout, shipping, …). If
Telegram has an update field, Nestgram has an `@On*` for it.
:::

## Several types, one handler

Usually you write one handler per type and share a private method. When a single
method genuinely fits several types, opt into a union with `@On([...])` — and the
compiler forces you to narrow before using type-specific fields.

:::code[feedback.router.ts]
```ts
import { On, UpdateType, Message, CallbackQuery } from 'nestgram';

@Router()
export class FeedbackRouter {
  @On([UpdateType.Message, UpdateType.CallbackQuery])
  handle(event: Message | CallbackQuery) {
    if (event.is(UpdateType.Message)) {
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
1. `@On([...])` lists the update types this method accepts.
2. The parameter is a **union** of the matching event types — no hidden optionals.
3. `event.is(UpdateType.Message)` narrows the union, so you only reach
   type-specific fields after a conscious check.
:::

:::tip
Prefer separate handlers calling a shared method — it keeps each handler's type
exact. Reach for `@On([...])` only when the branching genuinely belongs in one
place.
:::

---
title: Update types
description: Binding handlers to update kinds with @On* — the UpdateKind whitelist, how a kind is resolved, and stacking one method across several kinds.
sidebar:
  group: Routing
  order: 22
---

Telegram delivers one `Update` object per event, and exactly one of its fields
is populated — `message`, `callback_query`, `chat_member`, and so on. Each of
those field names is an **update kind**, and each kind has an `@On*` decorator
that binds a handler to it. The handler's first parameter is the concrete typed
event for that kind, positional, no decorator:

:::code[membership.router.ts]

```ts
import { Router, OnChatMember, ChatMemberUpdated } from 'nestgram';

@Router()
export class MembershipRouter {
  @OnChatMember()
  membershipChanged(update: ChatMemberUpdated) {
    return `${update.new_chat_member.user.first_name} is now ${update.new_chat_member.status}`;
  }
}
```

:::

## How a kind reaches your handler

The `@On*` decorator records one thing on the method: the raw update-field name
it listens to (`'chat_member'`). At boot, `DiscoveryService` collects every such
binding into the route table, **bucketed by that field name**. Nothing reflects
per update.

Per update, `resolveKind` reads which field the `Update` carries and returns the
matching `UpdateKind`; the route matcher then pulls only the bucket for that kind
and runs its predicates in declaration order, first match wins. So the `@On*`
field name and the resolved kind are the same string on both sides of the table —
that's the whole binding.

:::mental
update field -> resolveKind -> route table bucket -> predicates -> first match
:::

`resolveKind` walks an explicit whitelist — the `UpdateKind` enum — and returns
`null` for any field not in it. It never guesses from the shape of the payload.
That's the second invariant worth knowing:

:::tip
A field newer than this Nestgram version — a Bot API addition you haven't
upgraded to — isn't in `UpdateKind`, so `resolveKind` returns `null` and the
update isn't routed. The context factory logs a one-off warning naming the
unmodelled kind (once per kind) instead of dropping it silently, so a future
update type is visible the moment it arrives, not a phantom you debug later.
:::

## The @On\* catalog

Every kind in the `UpdateKind` whitelist has an `@On*` decorator. The first
parameter is the event class in the **Event** column.

| Decorator                     | Event                         | Update field                |
| ----------------------------- | ----------------------------- | --------------------------- |
| `@OnMessage()`                | `Message`                     | `message`                   |
| `@OnEditedMessage()`          | `Message`                     | `edited_message`            |
| `@OnChannelPost()`            | `Message`                     | `channel_post`              |
| `@OnEditedChannelPost()`      | `Message`                     | `edited_channel_post`       |
| `@OnBusinessConnection()`     | `BusinessConnection`          | `business_connection`       |
| `@OnBusinessMessage()`        | `Message`                     | `business_message`          |
| `@OnEditedBusinessMessage()`  | `Message`                     | `edited_business_message`   |
| `@OnDeletedBusinessMessage()` | `BusinessMessagesDeleted`     | `deleted_business_messages` |
| `@OnGuestMessage()`           | `Message`                     | `guest_message`             |
| `@OnMessageReaction()`        | `MessageReactionUpdated`      | `message_reaction`          |
| `@OnMessageReactionCount()`   | `MessageReactionCountUpdated` | `message_reaction_count`    |
| `@OnInlineQuery()`            | `InlineQuery`                 | `inline_query`              |
| `@OnChosenInlineResult()`     | `ChosenInlineResult`          | `chosen_inline_result`      |
| `@OnCallbackQuery()`          | `CallbackQuery`               | `callback_query`            |
| `@OnShippingQuery()`          | `ShippingQuery`               | `shipping_query`            |
| `@OnPreCheckoutQuery()`       | `PreCheckoutQuery`            | `pre_checkout_query`        |
| `@OnPurchasedPaidMedia()`     | `PaidMediaPurchased`          | `purchased_paid_media`      |
| `@OnPoll()`                   | `Poll`                        | `poll`                      |
| `@OnPollAnswer()`             | `PollAnswer`                  | `poll_answer`               |
| `@OnMyChatMember()`           | `ChatMemberUpdated`           | `my_chat_member`            |
| `@OnChatMember()`             | `ChatMemberUpdated`           | `chat_member`               |
| `@OnChatJoinRequest()`        | `ChatJoinRequest`             | `chat_join_request`         |
| `@OnChatBoost()`              | `ChatBoostUpdated`            | `chat_boost`                |
| `@OnRemovedChatBoost()`       | `ChatBoostRemoved`            | `removed_chat_boost`        |

:::note
`@On*` is the raw kind binding. For the common cases there's sugar layered on
top — `@OnStart()` and `@Command(...)` for slash commands, `@Action('done/:id')`
for callback buttons, `@Hears(...)` for text — each adds a predicate over the
right kind. Use those when they fit; reach for the bare `@On*` for the kinds
without dedicated sugar (membership, polls, reactions, business, boosts).
:::

:::caution
`guest_message` arrives as a `Message` like any other, but a guest exchange is
answered **once** with `bot.answerGuestQuery(message.guest_query_id, result)` (an
`InlineQueryResult`) — not `message.answer(...)`. There is no follow-up, typing,
or reaction on it.
:::

Every `@On*` takes optional predicates as arguments — extra match conditions,
all of which must pass — but that's narrowing within one kind, covered on the
routing page. This page is about the kind binding itself.

## Several kinds, one handler

You usually write one handler per kind and call a shared private method. When a
single method genuinely fits several kinds, **stack the decorators** — each one
records its own kind binding on the method, so the method lands in every matching
bucket. The parameter becomes a union of the event classes, and you narrow it
with `instanceof` (events are real classes, not interfaces).

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
      return event.answer(`You said: ${event.text}`);
    }
    return event.answer('Got it');
  }
}
```

:::

:::anno

1. Stacking `@OnMessage()` and `@OnCallbackQuery()` records two kind bindings on the one method — no union decorator needed; each binding routes its own kind.
2. The parameter is a **union** of the matching event classes — no hidden optionals, no god-context.
3. `instanceof Message` narrows the union, so you reach a kind-specific field only after a deliberate check — plain TypeScript, nothing framework-specific.

:::

:::tip
Prefer separate handlers delegating to a shared method — each handler keeps an
exact parameter type. Reach for stacked decorators only when the branching truly
belongs in one place.
:::

## What Telegram actually sends

A handler only fires if Telegram delivers its kind — and a few kinds are **held
back unless requested by name**: `chat_member`, `message_reaction`, and
`message_reaction_count`. With most libraries an `@OnChatMember()` handler
compiles, deploys, and then never fires, with no error anywhere.

Nestgram closes that gap at boot: it derives `allowed_updates` from your
handlers — every kind some `@On*` binds to is requested, for `getUpdates` in
polling mode and in the `setWebhook` registration in webhook mode. Write
`@OnChatMember()` and `chat_member` updates arrive; nothing to configure.

To take manual control, pass an explicit list — it wins over the derived one:

:::code[app.module.ts]

```ts
import { NestgramModule } from 'nestgram';

NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  polling: { allowed_updates: ['message', 'callback_query'] },
});
```

:::

The list values are the same update-field strings, typed as `AllowedUpdate` (the
string values of `UpdateKind`), so you write plain literals with autocomplete and
no enum import. With an explicit list, any handler bound to a kind the list omits
is dead code — Telegram never delivers it. Nestgram warns about each such handler
at boot, naming the router and method, so the mistake is one log line instead of
a production mystery.

:::note
An empty list (`allowed_updates: []`) means Telegram's _default_ set —
everything except `chat_member`, `message_reaction` and `message_reaction_count` —
not "nothing".

:::

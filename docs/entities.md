---
title: Message entities
description: Route on, inject, and read the mentions, hashtags, URLs, emails and commands Telegram marks up in a message — with @OnMention, @Mention, and message.hasEntity.
sidebar:
  label: Entities
  group: Routing
  order: 25
---

Telegram doesn't just hand you the text of a message — it also tells you which
_spans_ of that text are special: an `@mention`, a `#hashtag`, a `$cashtag`, a
`url`, an `email`, a `/command`, a `text_link`. Each is a **message entity**: a
`{ type, offset, length }` triple that points into the text (or a media
`caption`), rather than the substring itself. Nestgram gives you three ways to
work with them, cheapest first.

:::mental
route on an entity (`@OnMention`) → inject its text (`@Mention`) → read it off the event (`message.hasEntity`)
:::

## Route on an entity

The `@On*` family picks the handler by the _kind_ of entity present — the
message-type layer, same as [`@OnMessage`](/docs/update-types). `@OnEntity(type)` is
the generic form; the named aliases cover the common types.

```ts
import { OnMention, OnEntity, Router } from 'nestgram';
import type { Message } from 'nestgram';

@Router()
export class LinksRouter {
  // Fires for any message whose text OR caption contains a URL entity.
  @OnEntity('url')
  onLink(message: Message) {
    return 'nice link';
  }

  @OnMention()
  onMention(message: Message) {
    return 'you rang?';
  }
}
```

`@OnEmail`, `@OnUrl`, `@OnMention`, `@OnHashtag`, `@OnCashtag` and `@OnPhone` are
the built-in aliases; `@OnEntity('bot_command')` matches _any_ command (a
specific one is [`@Command('start')`](/docs/commands-and-parameters)).

## Inject the entity text

Inside a handler, the entity **param decorators** pull the resolved text straight
into an argument — no offsets, no slicing. Singular gives the first match;
plural gives every match, from the text and the caption both.

```ts
import { Router, OnMention, Mention, Mentions, Entities } from 'nestgram';
import type { Message } from 'nestgram';

@Router()
export class MentionRouter {
  @OnMention()
  onMention(
    message: Message,
    @Mention() first: string | undefined, // '@alice'
    @Mentions() all: string[], // ['@alice', '@bob']
    @Entities('url') urls: string[], // any URLs in the same message
  ) {
    return `first mention: ${first ?? 'none'}`;
  }
}
```

`@Email`/`@Emails`, `@Url`/`@Urls`, `@Hashtag`/`@Hashtags`, `@Cashtag`/`@Cashtags`
and `@Phone`/`@Phones` follow the same singular/plural pair. `@Entity(type)` and
`@Entities(type)` are the generic forms for any entity type.

## Read entities off the message

When the entity is _incidental_ to why the handler ran — you took the message
for another reason and now want to check it — read it off the rich
[`Message`](/docs/update-types) event directly.

```ts
// Does this message carry a mention at all?
message.hasEntity('mention'); // boolean

// Does it @mention this bot? (case-insensitive, @ optional — see below)
message.mentions('my_bot'); // boolean

// Every URL in the message, each with its text sliced out.
message.entitiesOf('url'); // MessageEntity[]  → [{ type: 'url', offset, length, text }]

// Every entity, any type.
message.entitiesOf();
```

`entitiesOf()` returns each entity with its `text` resolved — the object form of
`@Entities()`, useful when you also need an entity's `url` (`text_link`) or
`user` (`text_mention`) field, not just the span. Both methods draw from the
message text and a media caption, so `message.hasEntity('hashtag')` is `true`
whether the `#tag` sat in the text or under a photo.

Prefer `message.mentions(username)` over `hasEntity({ type: 'mention', text })`
for mentions: Telegram usernames are **case-insensitive**, so `@My_Bot` and
`@my_bot` are the same handle — but `hasEntity` matches the entity text exactly.
`mentions()` normalizes case and makes the leading `@` optional, so it's the
correct test. (It matches `@handle` mentions only, not the `text_mention` of a
user without a username.)

## Reconstruct the formatting

An incoming message arrives as plain `text` plus an `entities` array — the
**bold**, _italic_, `code`, links and spoilers are described positionally, not in
the string. `message.html` and `message.markdown` render that back into formatted
source, the inverse of sending with a `parse_mode`. A bot that quotes, echoes or
logs a user's message keeps its formatting instead of flattening it.

```ts
// message.text = 'hello world', one bold entity over 'world'
message.html; // 'hello <b>world</b>'
message.markdown; // 'hello *world*'  (MarkdownV2)

// Quote it straight back, formatting intact:
message.reply(message.html, { parse_mode: 'HTML' });
```

Both read from the caption for a media message, and are `''` when there's no
text or caption. Overlapping entities that can't be expressed as nested markup
are dropped to plain text rather than producing broken output.

:::note
Entity `offset`/`length` are **UTF-16 code units** — which is exactly how
JavaScript indexes strings, so nestgram slices them for you and you never touch
the offsets. Hand-rolling `text.slice(offset, offset + length)` yourself is the
one thing you don't need to do.
:::

## Entities in a custom predicate

The richest payoff is a [custom predicate](/docs/custom-predicates). A predicate
runs during route selection — before the handler — so it can't take a `Message`
argument. Instead it reads the update off the execution context. Reach for
**`ctx.message`**: the same rich `Message` a handler would get (entity sugar and
all), not the raw payload.

A common group-bot need — route a message to a handler only when it's addressed
to the bot (any DM, or in a group an `@mention` of the bot or a reply to it):

```ts
import type { RoutePredicate, TelegramExecutionContext } from 'nestgram';

export class AddressedToBotPredicate implements RoutePredicate {
  async matches(ctx: TelegramExecutionContext): Promise<boolean> {
    const message = ctx.message;
    if (!message?.from || message.from.is_bot) {
      return false;
    }
    if (message.chat.type === 'private') {
      return true;
    }

    const me = await ctx.bot.getMe();
    return (
      message.reply_to_message?.from?.id === me.id ||
      message.hasEntity({ type: 'mention', text: `@${me.username}` })
    );
  }
}
```

```ts
@OnMessage(new AddressedToBotPredicate())
chat(message: Message) {
  /* only runs when the message is aimed at the bot */
}
```

No `update.message` raw access, no `RawMessageEntity`, no offset math — the
predicate works with the rich event exactly as a handler does. `ctx.message` is
`undefined` for non-message updates (a callback query, a poll), so the optional
chain is the whole guard you need.

## Entity types

| Type           | Example              | Alias decorators             |
| -------------- | -------------------- | ---------------------------- |
| `mention`      | `@username`          | `@OnMention` · `@Mention(s)` |
| `hashtag`      | `#topic`             | `@OnHashtag` · `@Hashtag(s)` |
| `cashtag`      | `$USD`               | `@OnCashtag` · `@Cashtag(s)` |
| `bot_command`  | `/start`             | `@OnEntity('bot_command')`   |
| `url`          | `https://t.me`       | `@OnUrl` · `@Url(s)`         |
| `email`        | `hi@t.me`            | `@OnEmail` · `@Email(s)`     |
| `phone_number` | `+1-212-555-0123`    | `@OnPhone` · `@Phone(s)`     |
| `text_link`    | a clickable label    | `@OnEntity('text_link')`     |
| `text_mention` | a user without a `@` | `@OnEntity('text_mention')`  |
| `custom_emoji` | an inline emoji      | `@OnEntity('custom_emoji')`  |

Formatting entities (`bold`, `italic`, `code`, `spoiler`, …) ride in the same
list — reach them with `@OnEntity('code')` or `message.entitiesOf('spoiler')`.

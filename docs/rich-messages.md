---
title: Rich messages
description: Block-formatted content — headings, tables, dividers — via Bot API 10.1 rich messages, sent per call or rewritten bot-wide with the richMessages option.
sidebar:
  group: Events & replies
  order: 34
---

Bot API 10.1 added **rich messages**: block-formatted content with headings,
tables, dividers and collapsible sections — structure that `parse_mode` can't
render. You write the body as Markdown or HTML source; Telegram parses it into
rich blocks on its side. The source travels in an `InputRichMessage` object
(`markdown` or `html`, never both), not in the plain `text` field.

:::mental
text source (markdown/html) -> sendRichMessage -> Telegram renders blocks
:::

## Sending one

`sendRichMessage` is positional like `sendMessage`, with the rich-message
object where text would go: `(chat_id, rich_message, options?)`. Returning the
`SendRichMessage` command from a handler does the same thing — it's executed by
the result handler like any other send:

:::code[digest.router.ts]

```ts
import { Command, Message, Router, SendRichMessage } from 'nestgram';

@Router()
export class DigestRouter {
  @Command('digest')
  digest(message: Message) {
    return new SendRichMessage({
      chat_id: message.chat.id,
      rich_message: {
        markdown:
          '# Weekly digest\n| metric | value |\n| --- | --- |\n| users | 42 |',
      },
    });
  }
}
```

:::

The `rich_message` object carries the source plus a few rendering flags:

| Field                   | Type      | Meaning                                                       |
| ----------------------- | --------- | ------------------------------------------------------------- |
| `markdown`              | `string`  | Rich-dialect Markdown source (mutually exclusive with `html`) |
| `html`                  | `string`  | Rich-dialect HTML source                                      |
| `is_rtl`                | `boolean` | Render the blocks right-to-left                               |
| `skip_entity_detection` | `boolean` | Don't auto-link URLs/mentions in the source                   |

## Editing into rich

`editMessageText` overloads its content slot to `string | InputRichMessage`, so
the same call edits either kind in place — a string replaces the plain text, an
object replaces it with rich content. `message.editText(...)` is the sugar on
the current message:

:::code[edit.ts]

```ts
import { Message } from 'nestgram';

async function update(message: Message) {
  await message.editText('plain update');
  await message.editText({ markdown: '# Rich update' });
}
```

:::

## Rich by default: the `richMessages` option

Writing `new SendRichMessage(...)` for every reply defeats `return 'text'`. Set
the `richMessages` option and every plain outgoing text — string returns,
`message.answer()`, `message.reply()` — is rewritten into a `sendRichMessage`,
with the text carried through as your configured dialect's source. They all
funnel through `sendMessage` under the hood, so one rewrite covers the lot:

:::code[app.module.ts]{mark="9"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
      richMessages: { dialect: 'markdown' },
    }),
  ],
})
export class AppModule {}
```

:::

The mover is `RichMessagesInterceptor`, an ordinary interceptor in the bot's
outbound api-pipeline onion — no privileged core; you could write the same hook.
Omit the option and its settings token resolves to `null`, so the interceptor is
a passthrough and nothing changes. When it's on, it retargets `sendMessage` to
`sendRichMessage` only when the call hasn't already declared its own formatting
intent:

| Field on the call      | Effect                                                    |
| ---------------------- | --------------------------------------------------------- |
| `parse_mode`           | left a plain `sendMessage` — explicit format wins         |
| `entities`             | left a plain `sendMessage` — explicit format wins         |
| `link_preview_options` | left a plain `sendMessage` — the rich path can't honor it |

This is also why the interceptor sits **before** `DefaultParseModeInterceptor`
in the pipeline: the rewrite has to decide before a default `parse_mode` gets
injected, or that injected default would read as explicit intent and suppress
every rewrite.

:::warn[A different dialect]
Rich Markdown is not `MarkdownV2` — different escaping rules, plus headings and
tables on top. Opting in means writing your outgoing texts in the rich dialect,
the same standing commitment as a bot-wide `parseMode`.
:::

### The options

The option is two fields. An unknown `dialect` or `mode` throws a
`NestgramConfigError` at boot — a typo fails fast instead of silently leaving
the rewrite off:

| Option    | Values                    | Default      | Meaning                              |
| --------- | ------------------------- | ------------ | ------------------------------------ |
| `dialect` | `'markdown'` \| `'html'`  | _(required)_ | Which source field the text rides in |
| `mode`    | `'always'` \| `'dynamic'` | `'always'`   | When the rewrite fires               |

### `mode: 'dynamic'`

`'always'` sends every plain text as rich. Set `mode: 'dynamic'` to rewrite only
when the text actually uses a rich-only construct — a Markdown heading, a table
row (two cells or more), a divider, or an `<h1>`/`<table>`/`<details>`/`<hr>`
HTML tag. Plain bold, italics and links render fine through `parse_mode`, so
they alone don't trigger it; everything that isn't rich-only stays a normal
`sendMessage` formatted by your default `parseMode` as before:

:::code[stats.router.ts]

```ts
import { Module } from '@nestjs/common';
import { Command, NestgramModule, Router } from 'nestgram';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
      richMessages: { dialect: 'markdown', mode: 'dynamic' },
    }),
  ],
})
export class AppModule {}

@Router()
export class StatsRouter {
  @Command('stats')
  stats() {
    return '# Stats\n| day | sent |\n| --- | --- |\n| mon | 120 |'; // -> rich
  }

  @Command('ping')
  ping() {
    return 'pong'; // -> plain sendMessage
  }
}
```

:::

:::note
`dynamic` detects rich-only syntax with a per-dialect regex, so it's a
heuristic, not a parser. A lone `|wrapped|` line (one cell) isn't treated as a
table — but if you author rich content, prefer `'always'` and stay in one
dialect rather than relying on the trigger.
:::

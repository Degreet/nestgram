---
title: Rich messages
description: Send headings, tables and block-formatted text with Bot API 10.1 rich messages — per call or bot-wide with RichMessagesModule.
sidebar:
  group: Events & replies
  order: 34
---

Bot API 10.1 added **rich messages**: block-formatted content with headings,
tables, dividers, collapsible sections — things `parse_mode` can't render.
You write the content as Markdown or HTML source; Telegram parses it into
rich blocks on its side.

:::mental
text source (markdown/html) -> sendRichMessage -> Telegram renders blocks
:::

## Sending one

`bot.sendRichMessage()` takes the source object where `sendMessage` takes
text — or return the command object from a handler, like any other send:

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

## Editing into rich

`editMessageText` accepts either kind of content in the same positional slot:
a string edits the plain text, an object edits in rich content.

```ts
await message.editText('plain update');
await message.editText({ markdown: '# Rich update' });
```

## Rich by default: RichMessagesModule

Writing `new SendRichMessage(...)` for every reply defeats `return 'text'`.
Import `RichMessagesModule` once and every plain outgoing text — string
returns, `message.answer()`, `reply()` — is rewritten into `sendRichMessage`
with your configured dialect as the source:

:::code[app.module.ts]{mark="10"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, RichMessagesModule } from 'nestgram';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
    RichMessagesModule.forRoot({ dialect: 'markdown' }),
  ],
})
export class AppModule {}
```

:::

This is strictly **opt-in** — without the import nothing changes. The rewrite
is an ordinary API interceptor in the outbound pipeline (no privileged core),
and it deliberately skips calls that state their own formatting intent:
an explicit `parse_mode`, `entities`, or `link_preview_options` keeps the
call a plain `sendMessage`.

:::warn
Rich Markdown is a different dialect from `MarkdownV2` — different escaping
rules, plus headings and tables. Opting in means writing your outgoing texts
in the rich dialect, the same commitment as a bot-wide `parseMode`.

:::

### `mode: 'dynamic'`

If you only want rich rendering when the text actually needs it, set
`mode: 'dynamic'`: the rewrite then triggers only on rich-only constructs —
Markdown headings, table rows, dividers, or `<h1>`/`<table>`-class HTML
tags. Everything else stays a normal `sendMessage`, formatted by your
default `parseMode` as before:

```ts
RichMessagesModule.forRoot({ dialect: 'markdown', mode: 'dynamic' });
```

```ts
@Command('stats')
stats() {
  return '# Stats\n| day | sent |\n| --- | --- |\n| mon | 120 |'; // → rich
}

@Command('ping')
ping() {
  return 'pong'; // → plain sendMessage
}
```

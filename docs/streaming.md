---
title: Streaming
description: Stream a reply live into a private chat — an async iterable of text deltas animates a native rich-message draft, then persists as a real message.
sidebar:
  group: Events & replies
  order: 36
---

An LLM reply arrives token by token. Streaming pushes those tokens into
Telegram's native rich-message draft (`sendRichMessageDraft`) — an ephemeral
preview that **animates** as it grows — then persists the finished text as a
real message with `sendRichMessage`. You hand the framework an async iterable of
text deltas; it runs the draft loop, the throttling and the finalize.

:::mental
async iterable of deltas -> animated draft (coalesced) -> final sendRichMessage
:::

## The `*Stream` family

Three doors, one engine — return a stream, or call a method:

:::code[assistant.router.ts]

```ts
import { Router, Command, OnMessage, Message } from 'nestgram';

@Router()
export class AssistantRouter {
  // Bare return: the framework detects the async iterable and streams it.
  @Command('ask')
  ask(message: Message) {
    return llm(message.text ?? ''); // an AsyncIterable<string>
  }

  // Imperative: the same stream, but you hold the sent Message and pass options.
  @OnMessage()
  chat(message: Message) {
    return message.answerStream(llm(message.text ?? ''), { format: 'html' });
  }
}
```

:::

- `return <async-iterable>` — the return-value mirror of `return 'text'`. Zero
  config, defaults applied.
- `message.answerStream(source, options?)` / `message.replyStream(source, options?)`
  — sugar that resolves the sent `Message`.
- `bot.streamMessage(chat_id, source, options?)` — the hub the others funnel
  through; reach for it from a service that injects `BotService`.

## The source

A `StreamSource` is an `AsyncIterable<string>` of **deltas** — each yield
_appends_ to the growing message (not a replacement), the exact shape an LLM
SDK's streaming response already has. An `async function*` works too:

:::code[source.ts]

```ts
async function* llm(prompt: string): AsyncIterable<string> {
  yield 'Once ';
  yield 'upon ';
  yield 'a time…';
}
```

:::

The framework accumulates the deltas, so the final message is the whole
concatenation — regardless of how the animation was throttled along the way.

## Options

`StreamOptions` extends the `sendRichMessage` finalize options (reply target,
keyboard, `token`/`signal`…), which apply to the **persisted** message rather
than the draft frames, plus two streaming knobs:

| Option       | Type                   | Default      | Meaning                                   |
| ------------ | ---------------------- | ------------ | ----------------------------------------- |
| `format`     | `'markdown' \| 'html'` | `'markdown'` | Dialect the deltas are written in         |
| `throttleMs` | `number`               | `~1000`      | Minimum gap between animated draft frames |

Streaming coalesces to the latest text and pushes at most one frame per
`throttleMs`, so a fast token stream never floods — or queues behind — the send
throttler. The `format` values are the same [rich-message](/rich-messages)
dialects, since a draft frame _is_ a rich message.

## Private chats only

The native animated draft (`sendRichMessageDraft`) has no group equivalent, so
streaming is **private-chat only**. The doors part ways on how they say so:

| Door                                                 | In a group / channel                 | Catchable?                                            |
| ---------------------------------------------------- | ------------------------------------ | ----------------------------------------------------- |
| `bot.streamMessage` / `answerStream` / `replyStream` | rejects with a typed `NestgramError` | **yes** — `try/catch`, then fall back to `answer`     |
| bare `return <async-iterable>`                       | warned and dropped                   | no — like any bare return, it runs after the pipeline |

That mirror is the existing return contract: an awaited method throws so you can
react, a bare return is best-effort sugar that warns when it can't be honored.
Guest messages are refused the same way — a guest message's chat id can
misdeliver, so answer a guest exchange with `message.answerGuest(result)`.

:::note
A returned value is detected as a stream structurally — anything carrying a
`Symbol.asyncIterator`. A handler virtually never returns an async iterable for
another reason; if yours does and you don't mean to stream it, send it
imperatively (`await message.answerX(...)`) and return nothing.
:::

## No privileged core

The engine calls only the public generated `sendRichMessageDraft` /
`sendRichMessage`; `bot.streamMessage` is an ordinary hand-owned method you could
have written, and the bare-return path is one more branch in the same result
handler that turns `return 'text'` into a send. Nothing here is a privileged
built-in — see [how Nestgram works](/how-nestgram-works).

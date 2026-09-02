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
than the draft frames, plus the streaming knobs:

| Option       | Type                   | Default      | Meaning                                   |
| ------------ | ---------------------- | ------------ | ----------------------------------------- |
| `format`     | `'markdown' \| 'html'` | `'markdown'` | Dialect the deltas are written in         |
| `throttleMs` | `number`               | `~1000`      | Minimum gap between animated draft frames |
| `canStop`    | `boolean`              | `false`      | Show the user a button to stop generation |

Streaming coalesces to the latest text and pushes at most one frame per
`throttleMs`, so a fast token stream never floods — or queues behind — the send
throttler. The `format` values are the same [rich-message](/rich-messages)
dialects, since a draft frame _is_ a rich message.

## Letting the user stop it

`canStop: true` draws Telegram's own stop button on the animated draft. Pressing
it ends the stream: the framework stops consuming your source and persists
whatever text had arrived, so the user keeps the partial answer instead of losing
it (Telegram discards the draft itself).

:::code[assistant.router.ts]

```ts
import { Router, OnMessage, Message } from 'nestgram';

@Router()
export class AssistantRouter {
  @OnMessage()
  chat(message: Message) {
    return message.answerStream(llm(message.text ?? ''), { canStop: true });
  }
}
```

:::

Nothing else to wire — a built-in stage receives the stop update and matches it
back to the running stream by its chat and draft id. The derived
`allowed_updates` requests that kind for you; if you set
[an explicit list](/update-types#what-telegram-actually-sends) it must include
`'stopped_message_generation'`, and Nestgram warns at boot if it doesn't.

The one thing worth knowing is how your **source** is cancelled. The framework
stops iterating, which runs the generator's `finally` — so put your cleanup
there and the work behind the stream really does stop:

:::code[source.ts]

```ts
// Whatever your LLM SDK returns: an async iterable you can also abort.
declare function completion(prompt: string): AsyncIterable<string> & {
  abort(): void;
};

async function* tokens(prompt: string): AsyncIterable<string> {
  const call = completion(prompt);
  try {
    yield* call;
  } finally {
    // Runs whether the stream finished or the user stopped it.
    call.abort();
  }
}
```

:::

Without a `finally` your generator is simply abandoned: the message is still
finalized correctly, but the upstream request keeps burning tokens.

The stop is checked between deltas, so it lands when your source next yields — a
source stalled on a slow request finishes that request first. In practice that
is one token's latency.

:::note
What a user sees on the way there can look like the stop was ignored. Draft
frames are **coalesced**: each one carries the whole text so far, not one token,
and they go out at most once per `throttleMs`. So the first frame shows one
token and later frames add several at a time — reading as "it sped up". Then the
draft is replaced by the real message the instant the stream ends, which reads as
one last burst. Nothing is generated after the press: the final message holds
exactly the text the last frame did.
:::

### Running several instances

The stream and the stop update meet **in memory**, keyed by chat and draft id, so
the process that started a stream is the only one that can end it. One process,
or polling: nothing to do.

Behind a load balancer it matters. The stop can be delivered to an instance that
is not streaming, which then has nothing to end — the user presses stop and the
full answer arrives anyway. The framework tells you rather than hiding it: the
first unmatched stop logs a warning naming this cause, once.

Two ways out. Route a chat's updates to the same instance (sticky sessions on
`chat.id`) and the built-in keeps working as-is. Or forward the stop yourself —
`bot.stopStream(chat_id, draft_id)` is the same call the built-in makes, public
for exactly this:

:::code[stop-fanout.router.ts]

```ts
import {
  Router,
  OnMessageGenerationStopped,
  InjectBot,
  BotService,
} from 'nestgram';
import type { MessageGenerationStopped } from 'nestgram';

declare const bus: {
  publish(channel: string, payload: string): Promise<void>;
  subscribe(channel: string, onMessage: (payload: string) => void): void;
};

@Router()
export class StopFanoutRouter {
  constructor(@InjectBot() private readonly bot: BotService) {
    // Every instance listens; the one holding the stream ends it, the rest
    // return false and do nothing.
    bus.subscribe('stream:stop', (payload) => {
      const { chat_id, draft_id } = JSON.parse(payload) as {
        chat_id: number;
        draft_id: number;
      };
      this.bot.stopStream(chat_id, draft_id);
    });
  }

  @OnMessageGenerationStopped()
  fanOut(update: MessageGenerationStopped) {
    return bus.publish(
      'stream:stop',
      JSON.stringify({ chat_id: update.chat.id, draft_id: update.draft_id }),
    );
  }
}
```

:::

Your handler and the built-in both run — the built-in is a stage, not a route, so
it never competes for the update.

:::note
Registration is opt-in: a stream started without `canStop` is never tracked, so a
bot that doesn't use the feature holds nothing in memory for it.
:::

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

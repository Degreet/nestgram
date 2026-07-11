# streaming-bot

A Nestgram bot that streams its replies live. `/ask <text>` returns an async
iterable and the framework streams it; any other message is answered with
`message.answerStream(...)`. The reply animates in place via Telegram's native
rich-message draft, then finalizes into a real message.

The "LLM" here is a fake token generator (`fakeCompletion`) so the example runs
with no API key — swap it for a real provider's streaming response, which is
already an async iterable of text deltas.

Streaming uses `sendRichMessageDraft`, which is **private-chat only** — DM the
bot. In a group, `message.answerStream(...)` throws (catch it to fall back to a
plain `answer`), and a bare `return <stream>` is warned and dropped.

It imports from `nestgram` exactly as an app outside this repo would (resolved
to `lib/` via a tsconfig path alias here).

## Run

This folder is reference code (type-checked here, not shipped in the package).
To run it in your own project after `npm install nestgram@next`, point your usual
Nest toolchain at `main.ts`, e.g.:

```bash
BOT_TOKEN=123456789:your-token npx ts-node main.ts
```

Get a token from [@BotFather](https://t.me/BotFather). Polling needs no HTTP
server — the bot runs as a plain Nest application context.

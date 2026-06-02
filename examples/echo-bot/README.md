# echo-bot

A minimal Nestgram bot: `/start` greets with an inline keyboard, `ping`
(text or button) replies `pong`, and any other message is echoed back.

It imports from `nestgram` exactly as an app outside this repo would (resolved
to `lib/` via a tsconfig path alias here).

## Run

This folder is reference code (type-checked here, not shipped in the package).
To run it in your own project after `npm install nestgram`, point your usual
Nest toolchain at `main.ts`, e.g.:

```bash
BOT_TOKEN=123456789:your-token npx ts-node main.ts
```

Get a token from [@BotFather](https://t.me/BotFather). Polling needs no HTTP
server — the bot runs as a plain Nest application context.

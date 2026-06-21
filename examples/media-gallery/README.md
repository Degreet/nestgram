# media-gallery

A bot to play with Nestgram's media surface live — typed `InputFile` sources,
per-kind send sugar, the album builder, editing media in place, and reactions.
Every file is a remote URL Telegram fetches itself, so it runs with no local
assets.

| Command       | Shows                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| `/photo`      | `answerPhoto(url)` (remote = a string) with a caption and a **Swap** button. |
| Swap (button) | An untargeted `EditMessageMedia` return — **edited in place** by the engine. |
| `/album`      | A mixed photo + video album via the `MediaGroup` fluent builder.             |
| `/doc`        | `answerDocument(new InputFile(bytes, …))` — raw bytes uploaded as a file.    |
| _any text_    | A `👍` reaction via `message.react()`.                                       |

## Run

This folder imports from `nestgram` exactly as an outside app would — here it
resolves to `lib/` via the repo's `tsconfig` path alias. Run it from the **repo
root**:

```bash
BOT_TOKEN=123456789:your-token npx ts-node -r tsconfig-paths/register \
  examples/media-gallery/main.ts
```

Get a token from [@BotFather](https://t.me/BotFather). Polling needs no HTTP
server — the bot runs as a plain Nest application context, so `Ctrl-C` stops it
cleanly.

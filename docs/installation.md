---
title: Installation
description: Requirements, install, and getting a bot token from BotFather.
sidebar:
  group: Introduction
  order: 3
---

Nestgram is a normal npm package that plugs into a NestJS project. If you have a
Nest app, you're one install away.

## Requirements

- **Node.js 18+** (the engine uses the built-in `fetch` and `FormData`).
- **NestJS 10+** — `@nestjs/common` and `@nestjs/core` are peer dependencies, so
  a standard Nest project already satisfies them.

## Install

```bash
npm install nestgram@next
```

:::caution
The `next` tag matters while v2 is in alpha: plain `npm install nestgram`
gives you the old, incompatible v1 from 2022.
:::

:::note
Starting from scratch? Scaffold a Nest project first
(`npm i -g @nestjs/cli && nest new my-bot`), then add Nestgram. You don't need
`@nestjs/platform-express` for a polling bot — it runs as a plain application
context with no HTTP server.
:::

## Get a bot token

Every bot needs a token from Telegram's [@BotFather](https://t.me/BotFather):

1. Open a chat with **@BotFather** and send `/newbot`.
2. Pick a name and a username ending in `bot`.
3. Copy the token it gives you (looks like `123456789:AAExxxx...`).

Keep the token out of source control — load it from the environment:

```bash
BOT_TOKEN=123456789:AAExxxx... node dist/main.js
```

:::caution
Treat the token like a password. Anyone who has it can fully control your bot.
If it leaks, revoke it with `/revoke` in BotFather and issue a new one.
:::

With Nestgram installed and a token in hand, you're ready for the
[quickstart](/docs/quickstart).

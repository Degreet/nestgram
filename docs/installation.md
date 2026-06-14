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

## Recommended `tsconfig.json`

Nestgram is decorator-driven, so the compiler needs `experimentalDecorators`
and `emitDecoratorMetadata` (the standard Nest setup already enables both). A
fresh Nest project on **TypeScript 6** also turns on `isolatedModules` — and
that combination has one sharp edge worth knowing before you write your first
handler (see the next section).

:::code[tsconfig.json]{mark="7,8,9"}

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2022",
    "strict": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  }
}
```

:::

## Importing event types

With `isolatedModules` and `emitDecoratorMetadata` both on (the TypeScript 6
default for new projects), the compiler refuses to read a **type** out of a
**value** import when that type appears in a decorated handler signature:

```
error TS1272: A type referenced in a decorated signature must be imported with
'import type' or a namespace import when 'isolatedModules' and
'emitDecoratorMetadata' are enabled.
```

It fires on any handler with a param decorator — `start(message: Message,
@Sender() user: User)` trips it on `User`. The fix is to split the import:
values (decorators, classes, free functions) stay a normal import; **event
types come in through `import type`**:

:::code[greet.router.ts]{mark="1,2"}

```ts
import { Router, OnStart, Sender } from 'nestgram'; // values
import type { Message, User } from 'nestgram'; // types

@Router()
export class GreetRouter {
  @OnStart()
  start(message: Message, @Sender() user: User) {
    return `Hello, ${user.first_name}!`;
  }
}
```

:::

:::note
This is safe — Nestgram never reads a handler's `design:paramtypes`. Param
injection is decorator-based and the first argument is positional, so erasing
the type at compile time breaks nothing. Constructor DI is unaffected:
`constructor(private readonly svc: MyService)` stays a value import (the
constructor carries no Nestgram param decorator, so TS1272 doesn't touch it).
Splitting the imports also clears the matching `isolatedModules` warning
`ts-jest` prints in a new project.
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

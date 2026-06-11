<p align="center">
  <a href="https://nestgram.vercel.app" target="_blank">
    <img src="./media/logo.svg" width="180" alt="Nestgram logo" />
  </a>
</p>

<h1 align="center">Nestgram</h1>

<p align="center"><strong>Telegram bots, the NestJS way.</strong></p>

<p align="center">
  A real NestJS framework for the Telegram Bot API — modules, DI, pipes &amp;
  guards. Your bot is just another Nest app, built to scale and survive
  production.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nestgram"><img src="https://img.shields.io/npm/v/nestgram/next?label=npm%40next&color=1f8fe6" alt="npm version (next)" /></a>
  <a href="https://github.com/Degreet/nestgram/actions/workflows/ci.yml"><img src="https://github.com/Degreet/nestgram/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status" /></a>
  <a href="https://www.npmjs.com/package/nestgram"><img src="https://img.shields.io/npm/l/nestgram" alt="license" /></a>
</p>

---

> [!WARNING]
>
> **Nestgram v2 is a pre-release (`alpha`).** Everything described here is
> implemented and tested, but the public API may still shift before `2.0.0`.
> Install it with the `next` tag — plain `npm install nestgram` currently
> gives you the old, incompatible v1. See [ROADMAP.md](./ROADMAP.md) for
> status and [VISION.md](./VISION.md) for the design philosophy.

## A framework, not a wrapper

Most "NestJS Telegram" libraries are thin wrappers around `telegraf` or
`grammY`: a single mega-context object flows through your handlers, the
framework's own pipeline (guards, interceptors, pipes, exception filters)
never runs, and you end up guessing what is and isn't on `ctx`.

Nestgram is built **on Nest's own primitives** instead. A router is a
controller. An update is a request. Guards, interceptors, pipes and
exception filters run exactly as they do for HTTP — because it's the same
execution pipeline underneath.

## Installation

```bash
npm install nestgram@next
```

## Quick start

**1. A router** — methods bind to update types; the return value is sent
back to the chat.

```ts
// greet.router.ts
import { Router, Command, OnMessage, Sender, Message, User } from 'nestgram';

@Router()
export class GreetRouter {
  @Command('start')
  start(@Sender() user: User) {
    return `Hello, ${user.first_name}!`;
  }

  @OnMessage()
  echo(message: Message) {
    return message.text;
  }
}
```

**2. A module** — register the router like any Nest provider; Nestgram
discovers it automatically.

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';
import { GreetRouter } from './greet.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN,
      polling: true,
    }),
  ],
  providers: [GreetRouter],
})
export class AppModule {}
```

**3. Bootstrap** — a standard Nest application.

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
}

bootstrap();
```

That's a working echo bot with a `/start` command.

## What you get

- **Router = controller.** `@Router()` classes hold your handlers, grouped
  and nested like Nest modules.
- **Typed events, no guessing.** Each handler receives the concrete update
  object it asked for (`Message`, `CallbackQuery`, …) — fully typed, with
  actions on it (`message.answer(...)`).
- **The real Nest pipeline.** Guards, interceptors, pipes and exception
  filters run around every handler — `ValidationPipe` and
  `class-validator` DTOs included.
- **A current Bot API, generated.** The whole API layer — 176 methods and
  295 types (Bot API 10.0) — is generated from a daily scrape of the
  official docs. A new Telegram release is a regeneration, not a rewrite.
- **Zero magic strings.** `callbackData()` collapses building, matching and
  parsing callback buttons into one typed definition; `commandArgs()` does
  the same for command arguments; deep links get a typed factory too.
- **Sessions, FSM and i18n built in.** `@Session()` with memory/Redis
  stores, an aiogram-style finite state machine (`stateGroup()`), and an
  ambient `t()` translator over `AsyncLocalStorage`.
- **Production-minded.** Send throttling (30/s global, 1/s per chat,
  `429 retry_after`), webhook secret-token checks, graceful shutdown,
  startup health checks and per-update failure isolation are first-class.
- **No privileged core.** Built-in behaviours (auto-answering callbacks,
  default parse mode) are public, toggleable interceptors you could have
  written yourself — replace any of them without forking.

## Links

- Docs — [nestgram.vercel.app](https://nestgram.vercel.app)
- Telegram — [@nestgram_en](https://t.me/nestgram_en)
- Author — [Degreet](https://github.com/Degreet)

## License

[MIT](./LICENSE)

<p align="center"><sub>Inspired by Aiogram.</sub></p>

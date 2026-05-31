<p align="center">
  <a href="https://nestgram.com/" target="_blank">
    <img src="https://3560755491-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FHts9egaBIQFAK8US18Eu%2Ficon%2Ffz4kXEGCMyD53ezeoZ0L%2Fnestgram.svg?alt=media&token=1ff80c2e-517e-480f-b3ea-a9e04f36401a" width="180" alt="Nestgram logo" />
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
  <a href="https://www.npmjs.com/package/nestgram"><img src="https://img.shields.io/npm/v/nestgram" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/nestgram"><img src="https://img.shields.io/npm/l/nestgram" alt="license" /></a>
</p>

---

> [!WARNING]
> **Nestgram v2 is a pre-release (`alpha`) under active development.** The
> public API described here is the target we are building toward. See
> [ROADMAP.md](./ROADMAP.md) for status and [VISION.md](./VISION.md) for the
> design philosophy.

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
npm install nestgram
```

## Quick start

**1. A router** — methods bind to update types; the return value is sent
back to the chat.

```ts
// greet.router.ts
import { Router, Command, OnMessage, Message } from 'nestgram';

@Router()
export class GreetRouter {
  @Command('start')
  start(message: Message) {
    return `Hello, ${message.from.first_name}!`;
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
  filters run around every handler.
- **Sugar where it helps.** `@Command()`, `@Action()`, `@Hears()` and
  parameter decorators (`@Sender()`, `@Args()`, …) keep handlers short
  without hiding what's going on.
- **Production-minded.** Webhook secret-token checks, send throttling,
  graceful shutdown and startup health checks are first-class.

## Links

- Website — [nestgram.com](https://nestgram.com/)
- Telegram — [@nestgram_en](https://t.me/nestgram_en)
- Author — [Degreet](https://github.com/Degreet)

## License

[MIT](./LICENSE)

<p align="center"><sub>Inspired by Aiogram.</sub></p>

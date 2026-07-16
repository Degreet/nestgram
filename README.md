<p align="center">
  <a href="https://nestgram.vercel.app" target="_blank">
    <img src="./media/logo.svg" width="180" alt="Nestgram logo" />
  </a>
</p>

<h1 align="center">Nestgram</h1>

<p align="center"><strong>Telegram bots, the NestJS way.</strong></p>

<p align="center">
  A framework for building Telegram bots on NestJS — <strong>not</strong> a
  wrapper. Your bot is a real Nest app: a <code>@Router()</code> is a
  controller, an update is a request, your handler's return value is the reply.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nestgram"><img src="https://img.shields.io/npm/v/nestgram/next?label=npm%40next&color=1f8fe6" alt="npm version (next)" /></a>
  <a href="https://github.com/Degreet/nestgram/actions/workflows/ci.yml"><img src="https://github.com/Degreet/nestgram/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status" /></a>
  <a href="https://www.npmjs.com/package/nestgram"><img src="https://img.shields.io/npm/l/nestgram" alt="license" /></a>
</p>

---

```ts
import {
  Router,
  Command,
  Action,
  Param,
  Message,
  InlineKeyboard,
} from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class LikeRouter {
  @Command('post')
  post(message: Message) {
    return message.answer('Like this post?', {
      reply_markup: new InlineKeyboard().text('Like (0)', 'like/:count', {
        count: 0,
      }),
    });
  }

  // Returning a keyboard from a callback edits the message's buttons in place.
  @Action('like/:count')
  like(@Param('count', ParseIntPipe) count: number) {
    return new InlineKeyboard().text(`Like (${count + 1})`, 'like/:count', {
      count: count + 1,
    });
  }
}
```

A bare typed event in, your return value out. Route params live in the
template and arrive typed and validated — no `ctx` god-object, no manual
`callback_data` parsing.

> [!NOTE]
>
> **Nestgram v2 is alpha** — actively developed, but the API may shift before
> `2.0.0`. Install with the **`next`** tag (plain `nestgram` is still the old,
> incompatible v1):
>
> ```bash
> npm install nestgram@next
> ```

## When to choose Nestgram

Nestgram is for one specific situation: **you're building Telegram bots on
NestJS and want the bot to be a first-class Nest citizen** — handlers wrapped by
your own guards, interceptors, pipes and filters, services pulled in by DI —
instead of bridging to a parallel middleware world.

It earns its keep once you've felt the production pain: two fast taps racing on
a user's session or FSM state, an unhandled error silently killing your
long-poll, or `429` flood limits taking the bot down. Nestgram handles per-chat
ordering, crash isolation and flood control as **defaults** — not infrastructure
you hand-roll and get subtly wrong.

## Key features

You write declarative handlers; the framework ships the plumbing — routing,
dynamic keyboards, a per-chat update queue, flood control and a dozen built-ins,
most of them toggleable interceptors you could have written yourself.

- **A real Nest app, not a bridge.** A `@Router()` is a controller; handlers run
  through Nest's `ExternalContextCreator`, so your guards, interceptors, pipes,
  exception filters and DI work natively. The same pipeline runs in
  `NestgramTestbed`, so you test with fake updates — no Telegram, no API mocks.
- **Production-hardening on by default.** A per-chat update queue serializes each
  chat's updates, so two fast taps can't race on session or FSM state; one bad
  update never crashes the bot; and a flood-aware throttler honors `429`
  `retry_after`, pausing the whole bot or just the offending chat.
- **Declarative routing.** Typed event in, reply out — no `ctx` god-object. Route
  params live in the template (`@Command('add :amount')`, `@Action('like/:count')`)
  and arrive typed and validated via `@Param`, no manual `callback_data` parsing.
- **Rich, dynamic keyboards.** An inline-keyboard builder that maps straight over
  your data — `.map(data, …).split(2).paginate('id', { size: 8 })` — plus
  state-driven checkbox keyboards that re-render from per-message state:
  pagination, multi-select and edit-in-place, without hand-managing
  `callback_data`.
- **Always current, generated.** The entire typed API tracks Telegram (Bot API
  10.2), generated from a daily re-scrape of the official docs and CI-guarded
  against drift — so it never rots.
- **Building blocks for real flows.** Sessions (memory/Redis), ambient
  `t()`/`locale()` i18n without threading a `ctx` through every service, and an
  aiogram-style FSM for multi-step conversations.

## Quickstart

```bash
npm install nestgram@next
```

```ts
// greet.router.ts
import { Router, OnStart, OnMessage, Sender, Message, User } from 'nestgram';

@Router()
export class GreetRouter {
  @OnStart()
  start(@Sender() user: User) {
    return `Hello, ${user.first_name}!`;
  }

  @OnMessage()
  echo(message: Message) {
    return message.text;
  }
}
```

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';
import { GreetRouter } from './greet.router';

@Module({
  imports: [
    NestgramModule.forRoot({ token: process.env.BOT_TOKEN!, polling: true }),
  ],
  providers: [GreetRouter],
})
export class AppModule {}
```

```ts
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
}

void bootstrap();
```

That's a working bot — `/start` greets, anything else echoes. From here, the
docs cover webhooks, sessions, keyboards, FSM and i18n.

## Status

Nestgram v2 is **alpha**. It's actively developed, but the public API may still
shift before `2.0.0`, and it has no public production track record yet — weigh
that against your risk tolerance. The [roadmap](./ROADMAP.md) tracks where it's
heading.

Adopting it is cheap to reverse: most of what you write is plain Nest —
providers, guards, DI — not framework-proprietary `ctx` or scenes, so your
investment is portable. The API layer is generated and the whole thing is MIT,
so you're never stuck.

What's solid today: the engine, the per-chat queue, the throttler, FSM and
webhook handling are covered by integration tests, and the whole framework
compiles under `strict` TypeScript. The reliability features above are real and
on by default.

## Links

- Docs — [nestgram.vercel.app](https://nestgram.vercel.app)
- Design principles — [PHILOSOPHY.md](./PHILOSOPHY.md)
- Telegram — [@nestgram_en](https://t.me/nestgram_en)
- Author — [Degreet](https://github.com/Degreet)

## License

[MIT](./LICENSE)

<p align="center"><sub>Inspired by Aiogram.</sub></p>

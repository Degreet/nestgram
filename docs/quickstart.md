---
title: Quickstart
description: Install Nestgram and run a working echo bot in a few minutes.
sidebar:
  group: Getting started
  order: 10
---

In Nestgram a **router is a controller**. If you've written a Nest HTTP
controller, you already know the shape — you're just pointing it at Telegram
updates instead of routes. By the end of this page you'll have a running bot
that greets users on `/start` and echoes everything else back.

:::mental
Telegram update -> @Router() controller\* -> handler -> reply
:::

## Install

```bash
npm install nestgram@next
```

The `next` tag matters while v2 is in alpha — plain `npm install nestgram`
gives you the old v1. Nestgram expects `@nestjs/common` and `@nestjs/core`
(v10+) as peers, so a standard Nest project already has what it needs.

## Your first router

Write a class, decorate it with `@Router()`, and bind methods to update
types. Whatever a handler returns is sent back to the chat.

:::code[greet.router.ts]{mark="6"}

```ts
import { Router, Command, OnMessage, Message } from 'nestgram';

@Router()
export class GreetRouter {
  @Command('start')
  start(message: Message) {
    return `Hello, ${message.from?.first_name ?? 'there'}!`;
  }

  @OnMessage()
  echo(message: Message) {
    return message.text;
  }
}
```

:::

:::anno

1. The handler receives a **typed `Message`** as its first argument — no decorator, no guessing what's on it. You named the type, so you know exactly what arrived.
2. `@Command('start')` matches the `/start` command; `@OnMessage()` matches any message. Nestgram tries handlers in order and runs the first match.
3. Returning a `string` sends it as a reply — sugar over `message.answer(text)`, which you can call directly when you need options.

:::

:::tip
Most handlers stay one line. When you need more control, return a command
object (`return new SendMessage(...)`) or call an action on the event
(`message.answer(text, options)`) — same result, more knobs.
:::

## Register it in a module

Routers are plain Nest providers. List them in `providers` and Nestgram
discovers them automatically — there's no separate registry to maintain.

:::code[app.module.ts]{mark="10"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule } from 'nestgram';
import { GreetRouter } from './greet.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      polling: true,
    }),
  ],
  providers: [GreetRouter],
})
export class AppModule {}
```

:::

`NestgramModule.forRoot()` configures the bot itself (token, transport). It
does **not** take a list of routers — discovery handles that, so adding a
router never means editing two places.

:::guardrail[only in Nestgram]
If you set a webhook without a **secret_token**, Nestgram logs a startup
warning — anyone who learns your URL could spoof updates. Most wrappers stay
silent. We don't.
:::

:::note
Need config from a service or `ConfigModule`? Use
`NestgramModule.forRootAsync({ useFactory, inject })`, exactly like other
Nest dynamic modules.
:::

## Bootstrap

A polling bot needs no HTTP server — it's a plain Nest application context.
(A webhook bot bootstraps differently; the next section shows how.)

:::code[main.ts]

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
}

bootstrap();
```

:::

`enableShutdownHooks()` lets Nestgram stop polling cleanly on shutdown
instead of dropping mid-flight updates.

## Run it: polling or webhook

The same router runs unchanged in development (long polling) and production
(webhook). You switch the transport, not your code.

:::tabs{name="run"}
::tab[polling · dev]

```ts
NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  polling: true, // dev: long polling
});
```

::tab[webhook · prod]

```ts
NestgramModule.forRoot({
  token: process.env.BOT_TOKEN ?? '',
  webhook: {
    url: 'https://bot.example.com/telegram/webhook',
    secretToken: process.env.WH_SECRET, // ← guardrail satisfied
  },
});
```

:::

In polling mode that's the whole story — the bootstrap above already works.
A webhook changes two things: updates arrive over HTTP, so your app needs a
**controller** to receive them and a **real HTTP server** to run it.

First the receiver. Add the ready-made `WebhookController` to your module's
`controllers` — it serves `telegram/webhook` (point `url` there) and rejects
any request whose secret-token header doesn't match your `secretToken`. Need
a different route? Register `createWebhookController('your/path')` instead.
Want extra processing the moment an update lands? Write your own controller
and forward updates via `WebhookUpdateSource`. Nothing here is privileged —
the built-in controller is the same one you could write yourself.

:::code[app.module.ts]{mark="15"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, WebhookController } from 'nestgram';
import { GreetRouter } from './greet.router';

@Module({
  imports: [
    NestgramModule.forRoot({
      token: process.env.BOT_TOKEN ?? '',
      webhook: {
        url: 'https://bot.example.com/telegram/webhook',
        secretToken: process.env.WH_SECRET,
      },
    }),
  ],
  controllers: [WebhookController],
  providers: [GreetRouter],
})
export class AppModule {}
```

:::

Then the bootstrap: `NestFactory.create` instead of
`createApplicationContext`, plus `listen` — a controller only receives
requests in a real HTTP app. An application context has no HTTP server, so
with the polling bootstrap a webhook bot would sit silently dead.

:::code[main.ts]{mark="7"}

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  await app.listen(3000);
}

bootstrap();
```

:::

You never call `setWebhook` yourself: on boot Nestgram registers the webhook
URL with Telegram — `secretToken` included — and on shutdown it deletes it
again. Your half of the contract is serving the URL.

Then start it:

```bash
BOT_TOKEN=123456:your-token-here node dist/main.js
```

On startup Nestgram calls `getMe` as a health check and logs the bot it
connected as. Message your bot `/start` and then anything else — you'll get
a greeting and an echo.

:::warn[Nestgram warning]
[WebhookUpdateSource] Webhook is set without a **secretToken** — anyone who
learns the URL can spoof updates.

> set `webhook.secretToken` in `NestgramModule.forRoot`

:::

:::caution[Heading to production?]
Polling is great for development. For production you'll switch to a webhook —
and you must set a `secret_token`. Nestgram warns you at boot if a webhook is
configured without one, because anyone who learns your URL could spoof
updates otherwise.
:::

---
title: Quickstart
description: Install Nestgram and run a working echo bot in a few minutes.
---

In Nestgram a **router is a controller**. If you've written a Nest HTTP
controller, you already know the shape — you're just pointing it at Telegram
updates instead of routes. By the end of this page you'll have a running bot
that greets users on `/start` and echoes everything else back.

<div class="mental not-content">
  <div class="mm-label">Mental model</div>
  <div class="mm-flow">
    <span class="mm-box">Telegram update</span>
    <span class="mm-arrow">→</span>
    <span class="mm-box mm-accent">@Router() controller</span>
    <span class="mm-arrow">→</span>
    <span class="mm-box">handler</span>
    <span class="mm-arrow">→</span>
    <span class="mm-box">reply</span>
  </div>
</div>

## Install

```bash
npm install nestgram
```

Nestgram expects `@nestjs/common` and `@nestjs/core` (v10+) as peers, so a
standard Nest project already has what it needs.

## Your first router

Write a class, decorate it with `@Router()`, and bind methods to update
types. Whatever a handler returns is sent back to the chat.

```ts title="greet.router.ts" {6}
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

A few things to notice:

<div class="anno not-content">
  <div class="ai"><span class="n">1</span><p>The handler receives a <strong>typed <code>Message</code></strong> as its first argument — no decorator, no guessing what's on it. You named the type, so you know exactly what arrived.</p></div>
  <div class="ai"><span class="n">2</span><p><code>@Command('start')</code> matches the <code>/start</code> command; <code>@OnMessage()</code> matches any message. Nestgram tries handlers in order and runs the first match.</p></div>
  <div class="ai"><span class="n">3</span><p>Returning a <code>string</code> sends it as a reply — sugar over <code>message.answer(text)</code>, which you can call directly when you need options.</p></div>
</div>

:::tip
Most handlers stay one line. When you need more control, return a command
object (`return new SendMessage(...)`) or call an action on the event
(`message.answer(text, options)`) — same result, more knobs.
:::

## Register it in a module

Routers are plain Nest providers. List them in `providers` and Nestgram
discovers them automatically — there's no separate registry to maintain.

```ts title="app.module.ts" {10}
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

`NestgramModule.forRoot()` configures the bot itself (token, transport). It
does **not** take a list of routers — discovery handles that, so adding a
router never means editing two places.

<div class="guardrail not-content">
  <span class="gr-ico">⚠</span>
  <div class="gr-body">
    <span class="gr-label">GUARDRAIL · only in Nestgram</span>
    If you set a webhook without a <b>secret_token</b>, Nestgram logs a startup warning — anyone who learns your URL could spoof updates. Most wrappers stay silent. We don't.
  </div>
</div>

:::note
Need config from a service or `ConfigModule`? Use
`NestgramModule.forRootAsync({ useFactory, inject })`, exactly like other
Nest dynamic modules.
:::

## Bootstrap

A Nestgram bot is a standard Nest application context — no HTTP server
required for polling.

```ts title="main.ts"
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
}

bootstrap();
```

`enableShutdownHooks()` lets Nestgram stop polling cleanly on shutdown
instead of dropping mid-flight updates.

## Run it: polling or webhook

The same router runs unchanged in development (long polling) and production
(webhook). You switch the transport, not your code.

<div class="ng-tabs not-content">
<input type="radio" name="run" id="run-poll" checked />
<input type="radio" name="run" id="run-hook" />
<div class="ng-tablist"><label for="run-poll">polling · dev</label><label for="run-hook">webhook · prod</label></div>
<div class="ng-tab tab-1">

```ts
NestgramModule.forRoot({
  token: process.env.BOT_TOKEN,
  polling: true, // dev: long polling
});
```

</div>
<div class="ng-tab tab-2">

```ts
NestgramModule.forRoot({
  token: process.env.BOT_TOKEN,
  webhook: {
    url: 'https://bot.example.com/tg',
    secretToken: process.env.WH_SECRET, // ← guardrail satisfied
  },
});
```

</div>
</div>

Then start it:

```bash
BOT_TOKEN=123456:your-token-here node dist/main.js
```

On startup Nestgram calls `getMe` as a health check and logs the bot it
connected as. Message your bot `/start` and then anything else — you'll get
a greeting and an echo.

:::caution[Heading to production?]
Polling is great for development. For production you'll switch to a webhook —
and you must set a `secret_token`. Nestgram warns you at boot if a webhook is
configured without one, because anyone who learns your URL could spoof
updates otherwise.
:::

## Next

You have a working bot. Next, make it interactive with
[commands, parameters & keyboards →](./02-commands-and-keyboards.md)

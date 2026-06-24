---
title: Multiple bots
description: Run several bots from one Nest app — declare them in bots[], inject one by name with @InjectBot, reach the current update's bot with @Bot, and scope a router with @ForBot.
sidebar:
  group: Deployment
  order: 90
---

One app, several bots — a support bot and a sales bot, a bot per brand, a fleet
of white-label tenants. Each carries its own token, transport, and pipeline, yet
they share your routers, your services, and the one discovery engine. A single
bot stays exactly as it was (`forRoot({ token })`); multiplicity is just a list.

## Declaring the bots

Swap the top-level `token` for `bots: []`. Each entry is a `BotDefinition` — an
independent bot with its own token, transport, and pipeline flags:

:::code[app.module.ts]{mark="12,18"}

```ts
import { Module } from '@nestjs/common';
import { NestgramModule, ParseMode } from 'nestgram';

@Module({
  imports: [
    NestgramModule.forRoot({
      bots: [
        {
          name: 'support',
          token: process.env.SUPPORT_TOKEN ?? '',
          polling: true,
          default: true,
        },
        {
          name: 'sales',
          token: process.env.SALES_TOKEN ?? '',
          polling: true,
          parseMode: ParseMode.MarkdownV2,
        },
      ],
    }),
  ],
})
export class AppModule {}
```

:::

`parseMode` on `sales` belongs to that bot alone. Every flag — `parseMode`,
`throttle`, `richMessages`, `ignoreNotModified`, `apiInterceptors`, … — is
per-bot, because each bot gets its **own** `ApiInterceptor` pipeline built from
its definition. The send-time onion (token validation → default parse mode →
your interceptors → throttler) is assembled once per bot, so two bots never
share a rate limiter or a parse mode by accident.

`token` and `bots` are mutually exclusive, and `BotConfigResolver` enforces the
rest at boot, before DI exists: names must be distinct, tokens must be distinct,
and webhook secrets must be distinct. An inconsistent config throws a
`NestgramConfigError` at module-definition time rather than half-working.

### Picking the default bot

The **default** bot is the one a bare `BotService` injection — and `@InjectBot()`
with no name — resolves to. The rules are deliberate, never order-dependent:

| Bots configured        | Default                                                |
| ---------------------- | ------------------------------------------------------ |
| one                    | that bot, implicitly                                   |
| several, one `default` | the flagged bot                                        |
| several, no `default`  | none — a bare `BotService` is ambiguous and unavailable |
| several, two `default` | rejected at boot                                       |

With no default, co-equal bots (white-label tenants with no primary) are a valid
setup — you just reach each one by name with `@InjectBot(name)`. `BotConfigResolver`
will not silently pick the first bot, because that would make the default depend
on array order.

## Name them once

A bot's name is a plain string you choose, repeated across the config and the
decorators. Extract it once so a typo can't drift them apart:

:::code[bots.ts]

```ts
export enum Bots {
  Support = 'support',
  Sales = 'sales',
}
```

:::

:::tip
Then use `Bots.Support` everywhere — `{ name: Bots.Support }`,
`@InjectBot(Bots.Sales)`, `@ForBot(Bots.Support)`. One source of truth, no magic
strings. The framework imposes no naming scheme — any string works.
:::

## Three ways to reach a bot

| You want…                              | Use                  | Resolved                          |
| -------------------------------------- | -------------------- | --------------------------------- |
| a specific bot, from anywhere          | `@InjectBot(name)`   | at DI time, by static name        |
| the default bot                        | `@InjectBot()` / bare `BotService` | at DI time          |
| the bot that received THIS update      | `@Bot()`             | per update, from `ctx.bot`        |
| only-this-bot routing                  | `@ForBot(name)`      | per update, as a match predicate  |

### Reach a specific bot — `@InjectBot`

To send through a particular bot from a service — a proactive notification, a
cross-bot message — inject it by name. `@InjectBot(name)` is sugar over
`@Inject(getBotToken(name))`, so it resolves the bot declared under that name at
DI time and the name must be statically known:

:::code[alerts.service.ts]{mark="7"}

```ts
import { Injectable } from '@nestjs/common';
import { BotService, InjectBot } from 'nestgram';
import { Bots } from './bots';

@Injectable()
export class Alerts {
  constructor(@InjectBot(Bots.Sales) private readonly sales: BotService) {}

  shipped(chatId: number) {
    return this.sales.sendMessage(chatId, 'Your order shipped 📦');
  }
}
```

:::

`@InjectBot()` with no name gives the default bot — the same instance a bare
`BotService` injects.

### The current update's bot — `@Bot`

Inside a handler, `message.answer(...)` already replies through whichever bot
received the update — you rarely need anything else. When a handler genuinely
needs the bot object — its identity, a deep link, handing it to a service — take
it with `@Bot()`. The decorator reads `ctx.bot`, the per-update `BotService` the
dispatcher threaded in:

:::code[whoami.router.ts]{mark="6"}

```ts
import { Router, Command, Bot, Message, BotService } from 'nestgram';

@Router()
export class WhoAmIRouter {
  @Command('whoami')
  whoami(message: Message, @Bot() bot: BotService) {
    return `You're chatting with @${bot.username}.`;
  }
}
```

:::

`bot.name` identifies which bot it is; `bot.username` is its `@username`, cached
from `getMe` at startup.

:::note
For behaviour that **differs** per bot, reach for `@ForBot` (below) to split it
into per-bot handlers — not a `bot.name === …` branch in a shared handler.
Branching on `@Bot()` is for the rare case where one handler legitimately serves
several bots with a small variation; routing is the cleaner tool when the logic
itself diverges.
:::

### Scope a router to a bot — `@ForBot`

By default a router serves every bot. `@ForBot('name')` narrows it — on the class
for the whole router, or on a single handler. It is not a guard: it ANDs a
`ctx.bot.name === name` predicate into the route, on the same `@Match` mechanism
as `@AnyState()`. An update from another bot doesn't get rejected — it falls
through to the next matching route, exactly like any predicate that returns
`false`:

:::code[support.router.ts]{mark="5"}

```ts
import { Router, Command, ForBot, Message } from 'nestgram';
import { Bots } from './bots';

@Router()
@ForBot(Bots.Support)
export class SupportRouter {
  @Command('ticket')
  ticket(message: Message) {
    return 'Opening a support ticket…'; // only the support bot reaches here
  }
}
```

:::

## State stays per bot

Sessions and FSM are keyed by the bot too, so the same user in the same chat has
a separate session and flow on each bot — `support`'s counter never bleeds into
`sales`. Nothing to configure; the default conversation key includes the bot.

:::note
This holds for the built-in per-conversation key. A custom `key` you pass to
`SessionModule`/`FsmModule` should keep the bot in scope if you rely on the
isolation — read `ctx.bot.name`.
:::

## Transport: polling or webhook

Each bot has its own transport. **Polling** is the simplest — give each bot
`polling` and it runs its own long-polling loop, no coordination needed.

**Webhook** takes one more step. A Telegram update carries no bot identity, so a
multi-bot app has to know which bot an inbound POST is for. Two ready-made
controllers cover that; both are opt-in (you add them to a module's
`controllers`), and you can always write your own.

### A URL per bot — `MultiBotWebhookController`

Each bot gets its own route, `…/telegram/webhook/:botName`. Build the matching
`setWebhook` URL with `webhookUrl(origin, name)` so the registered URL can't
drift from the served route, then register the controller:

:::code[app.module.ts]{mark="19,35"}

```ts
import { Module } from '@nestjs/common';
import {
  NestgramModule,
  MultiBotWebhookController,
  webhookUrl,
} from 'nestgram';
import { Bots } from './bots';

const origin = process.env.WEBHOOK_ORIGIN ?? '';

@Module({
  imports: [
    NestgramModule.forRoot({
      bots: [
        {
          name: Bots.Support,
          token: process.env.SUPPORT_TOKEN ?? '',
          webhook: {
            url: webhookUrl(origin, Bots.Support),
            secretToken: process.env.SUPPORT_SECRET ?? '',
          },
          default: true,
        },
        {
          name: Bots.Sales,
          token: process.env.SALES_TOKEN ?? '',
          webhook: {
            url: webhookUrl(origin, Bots.Sales),
            secretToken: process.env.SALES_SECRET ?? '',
          },
        },
      ],
    }),
  ],
  controllers: [MultiBotWebhookController],
})
export class AppModule {}
```

:::

The controller injects the `WEBHOOK_SOURCES` array, indexes it by `source.name`,
and routes each POST by the `:botName` segment. That segment is public, so each
bot should set its own `secretToken` — the controller calls `source.verifySecret`
against THAT bot before delivering. An unknown name is a 404; a bad secret a 403.

### One URL for all bots — `SharedWebhookController`

Point every bot at the same `webhookUrl(origin)` (no name) and register
`SharedWebhookController` instead. With no `:botName` to go on, it routes by
secret: it finds the bot whose `source.ownsSecret` matches the incoming header,
falling back to the default bot, and drops the update (still answering 200) when
there's neither a match nor a default.

:::caution
A shared endpoint can only tell the bots apart by their secret, so give each a
**distinct** `secretToken`. `BotConfigResolver` rejects the config at boot if two
collide — without distinct secrets every update would land on the default bot.
:::

### Write your own

When neither shape fits — a bespoke route, extra receipt-time logic, your own
auth — inject the `WEBHOOK_SOURCES` array and route however you like. Each
`WebhookSourceEntry` carries the bot's `source` (with `name`, `verifySecret` /
`ownsSecret`, and `deliver`) and whether it `isDefault`:

:::code[my-webhook.controller.ts]{mark="21"}

```ts
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  Providers,
  SECRET_HEADER,
  RawUpdate,
  WebhookSourceEntry,
} from 'nestgram';

@Controller('telegram')
export class MyWebhookController {
  constructor(
    @Inject(Providers.WEBHOOK_SOURCES)
    private readonly bots: WebhookSourceEntry[],
  ) {}

  @Post('hook/:botName')
  @HttpCode(HttpStatus.OK)
  handle(
    @Param('botName') name: string,
    @Body() update: RawUpdate,
    @Headers(SECRET_HEADER) secret?: string,
  ): void {
    const bot = this.bots.find((entry) => entry.source.name === name);
    if (bot?.source.verifySecret(secret)) {
      void bot.source.deliver(update);
    }
  }
}
```

:::

`NestgramModule` is global, so `WEBHOOK_SOURCES` resolves wherever you register
the controller. The single-bot webhook is unchanged — there it's one bot, so the
ready-made `WebhookController` (or `createWebhookController(path)`) is all you
need.

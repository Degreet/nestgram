---
title: Multiple bots
description: Run several bots from one app — declare them in bots[], inject one by name with @InjectBot, reach the current one with @Bot, and scope a router with @ForBot.
sidebar:
  group: Multiple bots
  order: 90
---

One app, several bots — a support bot and a sales bot, a bot per brand, a fleet
of white-label bots. Each has its own token and its own pipeline, but they share
your routers, services, and the one engine. A single bot stays exactly as it was
(`forRoot({ token })`); multiplicity is just a list.

## Declaring the bots

Pass a `bots: []` instead of a top-level `token`. Each entry is an independent
bot with its own token, transport, and pipeline flags:

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

`parseMode` on `sales` is that bot's alone — every flag (`parseMode`, `throttle`,
`richMessages`, …) is per-bot, because each bot gets its **own interceptor
pipeline**.

The `default: true` bot is the one a bare `BotService` injection (and
`@InjectBot()` with no name) resolves to. With a single bot it's implicit; with
several, mark exactly one — or none, and then a bare `BotService` is ambiguous
and unavailable (reach each bot by name instead). Co-equal bots with no primary
(white-label tenants) are a valid setup.

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
strings. The framework imposes no naming — any string works.
:::

## Reach a specific bot — `@InjectBot`

To send through a particular bot from a service (a proactive notification, a
cross-bot message), inject it by name:

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

`@InjectBot(name)` resolves the bot declared under that name at compile time, so
the name must be statically known. `@InjectBot()` with no name gives the default
bot — the same instance a bare `BotService` injects.

## The current update's bot — `@Bot`

In a shared handler, `message.answer(...)` already replies through whichever bot
received the update — you rarely need anything else. When a handler genuinely
needs the bot object — its identity, a deep link, handing it to a service — take
it with `@Bot()`:

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

`@Bot()` is the bot that delivered THIS update, carried per-update; `bot.name`
identifies it.

:::note
For behaviour that **differs** per bot, reach for `@ForBot` (below) to split it
into per-bot handlers — not a `bot.name === …` branch in a shared handler.
Branching on `@Bot()` is for the rare case where one handler legitimately serves
several bots with a small variation; routing is the cleaner tool when the logic
itself diverges.
:::

## Scope a router to a bot — `@ForBot`

By default a router serves every bot. `@ForBot('name')` narrows it — on the class
for the whole router, or on a single handler. An update for another bot falls
through to the next matching route, just like any predicate:

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

## Transport: polling today

Each bot runs its own long-polling loop — they poll independently, no
coordination needed. Webhook is supported for a **single** bot (the top-level
`token` + `webhook` config); a webhook bot inside a `bots: []` fleet isn't routed
automatically yet, because one HTTPS endpoint has to fan inbound updates out to
the right bot.

:::warn[Multi-bot is polling]
In a `bots: []` app, give each bot `polling`. A fleet bot configured for
`webhook` is skipped at startup with a warning — it won't receive updates until
you wire a custom update source for it. Single-bot webhook is unchanged.
:::

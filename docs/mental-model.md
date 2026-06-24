---
title: Mental model
description: How an update flows through Nestgram — and why your bot is a Nest app, not a script bolted onto one.
sidebar:
  group: Introduction
  order: 2
---

Nestgram has one core idea, and the rest of the framework follows from it: **a
Telegram bot is a Nest app.** Not wired to one — it _is_ one.

- A `@Router()` is a controller.
- An incoming update is a request.
- Your handler's return value is the reply.

:::code[greet.router.ts]

```ts
import { Router, OnStart, Sender, User } from 'nestgram';

@Router()
export class GreetRouter {
  @OnStart()
  start(@Sender() user: User) {
    return `Hello, ${user.first_name}!`; // a string is a reply
  }
}
```

:::

Handlers run through Nest's own `ExternalContextCreator` — the same machinery
behind your HTTP controllers — so guards, interceptors, pipes and exception
filters wrap a router method exactly as they wrap a route. There's nothing new
to learn here; you already know how this works.

## Coming from telegraf or grammY?

Then your first question is _"where did my middleware go?"_ It didn't go
anywhere — it maps onto the Nest primitive that already does the job:

| You'd reach for…     | In Nestgram                                 |
| -------------------- | ------------------------------------------- |
| `bot.use(mw)`        | a guard, interceptor, pipe or filter        |
| the `ctx` god-object | the typed event argument + param decorators |
| `ctx.reply('hi')`    | `return 'hi'`                               |
| `bot.catch(...)`     | a Nest `@Catch()` exception filter          |

There's no parallel middleware system to learn — it's Nest, pointed at Telegram.

## The path an update takes

Every update follows the same route. Once you can picture it, the rest of the
docs are just detail on each stage.

:::mental
update source -> route table -> match -> Nest pipeline\* -> handler -> reply
:::

1. **Update source.** Long polling or a webhook. Updates run with bounded
   concurrency and per-update isolation — one failing update never takes the bot
   down — and each chat's updates are processed in order. The source is
   pluggable; nothing downstream cares where updates come from.
2. **Context, by wrapping.** The raw update is _wrapped_, never mutated. The
   wrapper exposes the concrete typed event and shared accessors, so the payload
   Telegram sent you stays untouched.
3. **Routing, resolved at boot.** `DiscoveryService` collects every `@Router()`
   and its handlers once at startup into a route table. Per update it's a
   lookup, not reflection.
4. **Match predicates.** `@OnStart()`, `@Command('add :amount')`,
   `@Action('done/:id')`, `@Hears(...)` decide _whether a handler applies_. This
   is routing — deliberately separate from guards and exception filters.
5. **The Nest pipeline.** Guards → interceptors → pipes → **handler** →
   exception filters, run through `ExternalContextCreator`. This is what makes
   the standard primitives work unchanged.
6. **Result handling.** A returned `string` becomes a reply; a command object
   (`new SendPhoto(...)`) is executed; an `InlineKeyboard` returned from a
   callback edits the message in place; `void` does nothing.

## Routing vs guarding

These look similar but answer different questions, and Nestgram keeps them
separate:

|            | Match predicate              | Guard (`CanActivate`)     |
| ---------- | ---------------------------- | ------------------------- |
| Question   | "Is this the right handler?" | "Is this caller allowed?" |
| On `false` | try the next handler         | reject the update         |
| Runs       | during routing               | inside the Nest pipeline  |

:::tip
Match predicates pick _which_ handler runs; guards decide whether the chosen
handler is _allowed_ to run. Use `@Command`/`@Action`/`@Hears` for the first,
`@UseGuards` for the second.
:::

---
title: Routers
description: A @Router() is a controller — discovered from the provider graph at boot, never registered by hand.
sidebar:
  group: Routing
  order: 20
---

A **router is a controller**. You decorate a class with `@Router()`, bind methods
to updates with listener decorators, and Nestgram routes each incoming update to
the first method that matches. There is no "register your routers" step — list the
class in a module's `providers` and discovery finds it.

:::code[greet.router.ts]

```ts
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

:::

:::mental
provider graph -> @Router classes -> route table (at boot) -> per-update lookup
:::

## Discovery, not registration

A router is a plain Nest provider. At startup `RouteExplorer` walks the provider
graph with Nest's own `DiscoveryService` + `MetadataScanner`, keeps the providers
whose constructor carries `@Router()` metadata, and collects each listener-decorated
method into an immutable **route table**. This runs once, at
`OnApplicationBootstrap` — the reflection cost is paid at boot, and per update the
dispatcher does a lookup, never reflection. `forRoot()` takes **no** list of routers.

:::code[app.module.ts]{mark="6"}

```ts
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

:::

:::anno

1. `@Router()` marks the class as a Nestgram controller and makes it injectable.
2. `DiscoveryService` collects every `@Router()` at boot; `RouteTable` holds the result, indexed by update type.
3. Adding a router means adding one provider — never editing the module's `imports`.

:::

## Routers are just providers

Because a router is a normal provider, **inject anything** through the constructor —
services, repositories, config — exactly like a Nest controller.

:::code[orders.router.ts]

```ts
import { Router, Command, Sender, User } from 'nestgram';
import { OrdersService } from './orders.service';

@Router()
export class OrdersRouter {
  constructor(private readonly orders: OrdersService) {}

  @Command('orders')
  list(@Sender() user: User) {
    return this.orders.summaryFor(user.id);
  }
}
```

:::

:::tip
Keep routers thin. They translate an update into a call on a service and turn the
result into a reply — the same discipline you'd apply to an HTTP controller.
Business logic lives in providers, not in the handler.
:::

## What a handler receives and returns

The first parameter is the **concrete, typed event** — bare, no decorator. The
framework auto-applies `@Event()` to param 0, so you write `handle(message: Message)`
and get the rich `Message`. Param decorators are reserved for **cross-cutting and
derived** values: `@Sender()` for the `User`, `@Param('id', ParseIntPipe)` for a
captured callback segment, `@Args()` for parsed command arguments.

The return value is the reply: a `string` is sent as text, a command object
(`new SendMessage(...)`) is executed, and `void` does nothing.

:::code[reminders.router.ts]

```ts
import { ParseIntPipe } from '@nestjs/common';
import { Router, Action, CallbackQuery, Param } from 'nestgram';
import { ReminderService } from './reminder.service';

@Router()
export class ReminderRouter {
  constructor(private readonly reminders: ReminderService) {}

  @Action('done/:id')
  async done(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {
    await this.reminders.markDone(id);
    return query.answer('Marked done');
  }
}
```

:::

:::note
A method becomes a handler only when it carries a listener decorator. A plain method
on a router class is ignored by routing, so private helpers can live right beside
your handlers.
:::

## Listener decorators

A listener decorator binds a method to an update type and, optionally, a match
predicate. The common ones:

| Decorator               | Fires on                                        | Sugar for                          |
| ----------------------- | ----------------------------------------------- | ---------------------------------- |
| `@OnStart()`            | `/start` (a payload route handles deep links)   | `@Command('start ...')`            |
| `@OnHelp()`             | `/help`                                          | `@Command('help')`                 |
| `@Command('add :note')` | a bot command, exact-arity route template       | `@OnMessage` + a command predicate |
| `@Action('done/:id')`   | a callback-query button press, route template   | `@OnCallbackQuery` + a predicate   |
| `@Hears(/^\d+$/)`       | a `message` whose text matches a string/regex   | `@OnMessage` + a text predicate    |
| `@OnMessage()`          | any `message` update                            | —                                  |
| `@OnText()`             | a `message` carrying `text`                      | `@OnMessage` + a content predicate |

Use `@OnStart()` for `/start`, never `@Command('start')` — `@OnStart` also wires up
deep-link payload routing. A method can stack several listeners; each one becomes its
own route, so `@OnHelp()` plus `@HearsKey(menuButton)` on one method answers both a
slash command and a reply-keyboard tap.

## First match wins

Within a router, **the first method whose predicates pass — in declaration order —
wins, and no other handler runs for that update.** The dispatcher takes the head of
`routeMatcher.findMatches(...)` and stops; the rest is an ordered remainder that a
future skip mechanism will fall through to. This is why a specific `@Command('add')`
must be declared *above* a catch-all `@OnMessage()` on the same router — flip them
and the catch-all swallows the command first.

That ordering guarantee holds **within** one router. Across routers, order is
discovery order and is not specified — so a `@Command`/`@Hears` only reliably beats a
catch-all when both live on the same router. Keep the specific handler and its
fallback together.

:::tip
The route table is indexed by `UpdateKind`, so a `callback_query` update only ever
walks the callback routes — a catch-all `@OnMessage()` on another router can't shadow
your `@Action`, because they live in different buckets.
:::

## Which kind is this update?

Before matching, the engine resolves the update to exactly one `UpdateKind` via
`resolveKind`, which checks an **explicit whitelist** of known Bot API fields in
priority order. A field this engine version doesn't model — a future Bot API addition
— resolves to `null`; the context factory logs a one-off warning and skips it rather
than guessing. Inside a handler you can read the resolved kind off the execution
context as `ctx.kind` (`UpdateKind`), though you rarely need to — the typed event
already tells you what you're holding.

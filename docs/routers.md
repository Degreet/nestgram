---
title: Routers
description: A @Router() is a controller. Handlers are discovered from the provider graph — no central registry.
sidebar:
  group: Routing
  order: 20
---

A **router is a controller**. You decorate a class with `@Router()`, bind
methods to updates, and Nestgram routes incoming updates to those methods. There
is no separate "register your routers" step — they're discovered.

:::code[greet.router.ts]
```ts
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
:::

## Discovery, not registration

A router is a plain Nest provider. List it in `providers` and Nestgram finds it
at startup by scanning the provider graph — `forRoot()` takes **no** list of
routers.

:::code[app.module.ts]
```ts
@Module({
  imports: [NestgramModule.forRoot({ token: process.env.BOT_TOKEN, polling: true })],
  providers: [GreetRouter],
})
export class AppModule {}
```
:::

:::anno
1. `@Router()` marks the class as a Nestgram controller and makes it injectable.
2. Discovery runs once at boot and builds an immutable route table — per update it's a lookup, never reflection.
3. Adding a router means adding one provider, never editing the module's imports.
:::

## Routers are just providers

Because a router is a normal provider, **inject anything** — services,
repositories, config — through the constructor, exactly like a Nest controller.

:::code[orders.router.ts]
```ts
@Router()
export class OrdersRouter {
  constructor(private readonly orders: OrdersService) {}

  @Command('orders')
  list(message: Message) {
    return this.orders.summaryFor(message.from.id);
  }
}
```
:::

:::tip
Keep routers thin. They translate updates into calls on services and turn the
result into a reply — the same discipline you'd apply to an HTTP controller.
Business logic lives in providers, not in the handler.
:::

## What a handler receives and returns

The first parameter is the **concrete, typed event** — no decorator. The return
value is the reply: a `string` is sent as text, a command object is executed,
`void` does nothing. Derived values (the sender, parsed args) come from
[parameter decorators](/docs/parameter-decorators).

:::note
A method becomes a handler only when it carries a listener decorator
(`@Command`, `@OnMessage`, `@Action`, …). Plain methods are ignored by routing,
so you can keep private helpers on the router class.
:::

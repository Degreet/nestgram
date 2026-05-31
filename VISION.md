# Nestgram — Vision

This document is the source of truth for *what Nestgram is and why*. It
describes the target design, not the current state of the code. For delivery
phases see [ROADMAP.md](./ROADMAP.md).

## What Nestgram is

Nestgram is a **framework** for building Telegram bots on top of NestJS —
not a wrapper around an existing bot library. It uses Nest's own execution
pipeline so that a Telegram bot is structured, tested and scaled exactly
like any other Nest application.

It is aimed at developers who already know Node.js and NestJS and want to
build serious, production-grade bots — including those who have never
touched the Telegram Bot API directly.

## Core principle: DX over our own code purity

When developer experience and the internal cleanliness of the framework
conflict, **developer experience wins.** Both matter, but the priority is
not negotiable.

This is Nest's own bargain: complex, reflection-heavy internals in exchange
for sterile, declarative application code. We accept hard work inside the
framework — code generation, discovery, rich event objects, custom
execution contexts — so that the bot author writes the least, clearest code
possible.

## Mental model

```
Telegram update  →  @Router() controller  →  handler method  →  reply
```

A `@Router()` is a controller. An incoming update is a request. The value a
handler returns is the reply. If you've written a Nest HTTP controller, you
already know the shape — you're just pointing it at Telegram updates instead
of routes.

## The pipeline

From raw update to action, in order:

1. **Update source (pluggable).** Long polling or webhook. The webhook
   source validates `X-Telegram-Bot-Api-Secret-Token`. Updates are processed
   with bounded concurrency and isolation: one failing update never takes
   down the bot.
2. **Context, by wrapping — never mutating.** The raw update is wrapped, not
   decorated with private fields. The wrapper exposes the concrete event and
   shared accessors.
3. **Routing (resolved at boot).** `DiscoveryService` + `MetadataScanner`
   collect every `@Router()` and its handlers once at startup into a route
   table. Per update we do a lookup, not reflection.
4. **Match predicates.** `@Command('start')`, `@Action(/buy:(\d+)/)`,
   `@Hears(...)`, `@OnMessage()` decide *whether a handler applies* to this
   update. This is routing — deliberately distinct from Nest exception
   filters.
5. **The Nest pipeline, around the handler.** Guards → interceptors → pipes
   → **handler** → exception filters. This runs through Nest's
   `ExternalContextCreator`, which is what makes the standard primitives work
   unchanged.
6. **Result handling.** A returned `string` becomes a reply; a returned
   command object (`new SendPhoto(...)`) is executed; `void` does nothing.

## Handlers and parameters

The default style optimises for short, readable handlers (see the core
principle).

**The main argument is the concrete, typed event — positional, no
decorator.**

```ts
@OnMessage()
handle(message: Message) {
  return message.answer('Hi');
}

@OnCallbackQuery()
handle(query: CallbackQuery) {
  return query.answer('Done');
}
```

This is the central design choice, and it is what fixes the biggest pain of
mega-context frameworks: nothing is hidden behind a decorator + metadata
lookup, and there is no `@CallbackQuery() x: CallbackQuery` name collision.
You always know exactly what arrived because you named its type.

**Events are rich classes, not plain objects.** The event carries both data
and the actions you can take on it (`message.answer(...)`), which under the
hood build and execute a command object. This keeps the actions attached to
the thing that arrived, instead of forcing a god-object to carry every
possible action.

**Parameter decorators are only for cross-cutting or derived values** —
never for the main event:

```ts
@Command('start')
start(@Sender() user: User) {
  return `Hello, ${user.first_name}!`;
}
```

`@Sender()`, `@Args()`, `@Payload()`, `@CallbackData()`, `@Session()` read
something derived or shared. They never collide with type names, and they're
sugar — the same data is reachable from the event itself.

**One handler for several update types** is the only place a thin context is
justified. The default is separate handlers sharing a private method; when a
single method really is wanted, you opt into a union and the compiler forces
you to narrow:

```ts
@On([UpdateType.Message, UpdateType.CallbackQuery])
handle(event: Message | CallbackQuery) {
  if (event.is(UpdateType.Message)) {
    // narrowed to Message
  }
}
```

No silent optionals — you enter the union consciously.

## Return values: command objects underneath

`message.answer(text)` and returning a `string` are sugar on top of a
**command object** layer (`new SendMessage(...)`). The command object is the
foundation; the sugar is built on it. This keeps a power-user, fully
testable path available (`return new SendPhoto(...)` — assert on the
returned object, no API mocks) without making it the everyday syntax.

## Why real NestJS primitives

The whole point is that **guards, interceptors, pipes and exception filters
just work.** We achieve this by running handlers through Nest's
`ExternalContextCreator` rather than calling them directly. There is no
custom "middleware" concept bolted on the side — cross-cutting concerns use
the Nest mechanisms developers already know.

## Types via code generation

The Telegram Bot API has 150+ types and grows every month, and there is no
official machine-readable spec. We generate our types **and** method classes
from a community spec (e.g. `ark0f/tg-bot-api`), so keeping up with API
changes is a generator run, not manual labour. Ergonomics (rich events,
sugar) are built by hand on top of the generated layer.

## Production-first

A framework for bots "under load" must ship the boring-but-critical pieces:

- Webhook secret-token validation, with a warning if a webhook is set
  without one.
- Send throttling that respects Telegram limits and `429 retry_after`.
- Graceful shutdown and a startup health check (`getMe`).
- Update processing that isolates failures.

## Non-goals

- Not a wrapper over `telegraf`/`grammY`.
- Not a custom middleware system parallel to Nest's primitives.
- Not a hand-maintained list of API types.
- Not a beginner-programming tutorial framework — the audience is
  experienced Node/NestJS developers.
- Not telegraf-style reference docs (a dry dump of classes and methods).

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
   Inside a callback, this extends symmetrically to editing the message in
   place: a returned `InlineKeyboard` edits its markup, and a returned edit
   command (`new EditMessageText(...)`) has its `chat_id`/`message_id` filled
   from the callback message — no manual target plumbing.

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

## Configurable defaults, all toggleable

A framework for real projects must let you set sane defaults once and forget
them — and turn any of them off. Defaults are configured on the module and
overridable per call or per handler:

- **Default parse mode** — set `parseMode: 'HTML'` once; every send inherits
  it unless a call overrides it. Pass nothing / `undefined` to opt a call out.
- **Auto-answer callback queries** — if a callback handler finishes without
  manually answering, the framework calls `query.answer()` for you so the
  button never spins. On a thrown error the exception filter decides instead.
  Disable globally or per handler.

The rule: every convenience is opt-out, never mandatory.

## Flexibility: no privileged core

Nestgram's own behaviours are built on the **same public extension points it
gives you** — guards, interceptors, pipes, exception filters, the pluggable
update source. Auto-answer is just an interceptor. Default parse mode is just
a send-pipeline hook. Nothing the framework does is off-limits or magic you
can't reach.

The practical promise: if a feature doesn't exist, you can write it yourself
at the same level the framework would, and drop it in. If a built-in doesn't
fit, you can replace it. A developer building on Nestgram can extend or
re-implement any behaviour mid-project without forking us. The engine
(discovery, context creation, update source) is what you configure; every
behaviour on top of it is a plugin you own.

## Typed callback data — no magic strings

Callback data is where magic strings breed: you write `buy:` when building a
button, a `/^buy:(\d+)$/` regex to match it, and a `split(':')` to parse it —
three places to drift. Nestgram provides a typed callback-data factory that
collapses all three into one definition:

```ts
const Buy = callbackData('buy', { productId: Number });

new InlineKeyboard().text('Buy', Buy.pack({ productId: 42 })); // build
@Action(Buy.filter())                                          // match
buy(query: CallbackQuery, @Data() data: { productId: number }) {} // typed parse
```

No literal separators, no hand-written regex, no positional `split` indexing.
The same idea is encouraged everywhere user-facing strings carry structure.

## Readable handlers over clever ones

Examples and APIs favour code a reader understands at a glance: destructuring
over positional indexing (`const [, id] = data.split(':')`, never
`data.split(':')[1]`), named helpers over inline magic, no unexplained `:`/`_`
separators. The typed callback-data factory above is the preferred way to
avoid the magic entirely.

## i18n via ambient context (AsyncLocalStorage)

Locale resolution must not thread a `lang` argument through every function.
Nestgram establishes an ambient per-update context using `AsyncLocalStorage`
(via `nestjs-cls`, so guards/interceptors/services share it), seeded once when
an update starts processing. A `t()` translator and the current locale are
reachable anywhere in the call stack for that update.

Honest caveat baked into the design: `AsyncLocalStorage` is in-process. Work
offloaded to a separate worker/queue (e.g. BullMQ) crosses a process boundary
and must carry the locale explicitly — the framework passes it through rather
than pretending the ambient store survives.

## Non-goals

- Not a wrapper over `telegraf`/`grammY`.
- Not a custom middleware system parallel to Nest's primitives.
- Not a hand-maintained list of API types.
- Not a beginner-programming tutorial framework — the audience is
  experienced Node/NestJS developers.
- Not telegraf-style reference docs (a dry dump of classes and methods).

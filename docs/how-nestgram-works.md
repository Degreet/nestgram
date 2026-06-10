---
title: How Nestgram works
description: The design behind the framework — layers, the update pipeline, and why it leans on real Nest primitives.
sidebar:
  group: Concepts
  order: 120
---

You can build bots without reading this page. But understanding the design tells
you _where_ to reach when you need something the guides didn't cover — and why
you can almost always add it yourself.

## DX over internal purity

When developer experience and the framework's own internal cleanliness conflict,
**developer experience wins.** This is Nest's own bargain: complex,
reflection-heavy internals in exchange for sterile, declarative application code.
Nestgram does the hard work — discovery, rich event objects, a custom execution
context — so your bot code stays minimal and obvious.

## The pipeline

Every update takes the same path:

:::mental
update source -> route table -> match -> Nest pipeline\* -> handler -> reply
:::

1. **Update source** — polling or webhook. Pluggable; the rest of the
   pipeline doesn't care where updates come from.
2. **Context by wrapping** — the raw update is wrapped in a
   `TelegramExecutionContext`, never mutated. The wrapper carries the resolved
   kind, a lazily-built rich event, and a per-update [state store](/docs/extending).
3. **Routing** — a route table built once at boot from your `@Router()` classes;
   per update it's a lookup, not reflection.
4. **Match predicates** — `@Command`/`@Action`/`@Hears`/`@On*` decide which
   handler applies.
5. **The Nest pipeline** — guards → interceptors → pipes → handler → exception
   filters, via Nest's `ExternalContextCreator`.
6. **Result handling** — a returned `string` is replied; a command object is
   executed; `void` does nothing.

## The layers

Nestgram is organised by layer, not by feature — each part has a distinct job:

| Layer        | What lives there                                                                     |
| ------------ | ------------------------------------------------------------------------------------ |
| `engine`     | the update→dispatch machinery: source, discovery, matching, execution, context       |
| `api`        | talking to Telegram: the transport client and the command objects (`SendMessage`, …) |
| `events`     | rich typed events (`Message`, `CallbackQuery`) — data plus the actions on them       |
| `decorators` | the public surface: `@Router`, the listeners, the param decorators                   |

## Why real Nest primitives

The point of building on Nest's pipeline is that **guards, interceptors, pipes
and exception filters just work** — the same `@UseGuards(AdminGuard)` you'd write
on an HTTP controller works on a router, unchanged. There's no parallel
"middleware" system to learn.

:::guardrail[only in Nestgram]
Nothing the framework does is privileged. Auto-answer is an ordinary
interceptor; the default parse mode is an ordinary send hook; matching is an
ordinary predicate. Every built-in is built on the same public extension points
you get — so you can replace any of them. See [Extending Nestgram](/docs/extending).
:::

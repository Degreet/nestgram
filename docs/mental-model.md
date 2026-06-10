---
title: Mental model
description: How an update flows through Nestgram, from raw JSON to a reply.
sidebar:
  group: Introduction
  order: 2
---

Every update takes the same path through Nestgram. Once you can picture it, the
rest of the docs are just detail on each stage.

:::mental
update source -> route table -> match -> Nest pipeline\* -> handler -> reply
:::

## The pipeline, stage by stage

1. **Update source.** Long polling or webhook. Updates are processed with
   bounded concurrency and isolation — one failing update never takes down the
   bot. The source is pluggable; the rest of the pipeline doesn't care where
   updates come from.
2. **Context, by wrapping.** The raw update is _wrapped_, never mutated. The
   wrapper exposes the concrete event and shared accessors, so the payload you
   received from Telegram stays untouched.
3. **Routing, resolved at boot.** `DiscoveryService` collects every `@Router()`
   and its handlers once at startup into a route table. Per update it's a
   lookup, not reflection.
4. **Match predicates.** `@Command('start')`, `@Action(/buy:(\d+)/)`,
   `@Hears(...)`, `@OnMessage()` decide _whether a handler applies_. This is
   routing — deliberately distinct from guards and exception filters.
5. **The Nest pipeline.** Guards → interceptors → pipes → **handler** →
   exception filters, run through Nest's `ExternalContextCreator`. This is what
   makes the standard primitives work unchanged.
6. **Result handling.** A returned `string` becomes a reply; a returned command
   object (`new SendPhoto(...)`) is executed; `void` does nothing.

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

## Why real Nest primitives

The whole point is that guards, interceptors, pipes and exception filters
**just work** — no Nestgram-specific adaptation. Because handlers run through
`ExternalContextCreator`, the same `@UseGuards(AdminGuard)` you'd write on an
HTTP controller works on a router, unchanged.

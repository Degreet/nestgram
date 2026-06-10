---
title: What is Nestgram
description: A real NestJS framework for Telegram bots — not a wrapper around an existing bot library.
sidebar:
  group: Introduction
  order: 1
---

Nestgram is a **framework for building Telegram bots on top of NestJS** — not a
wrapper around `telegraf` or `grammY`. It runs your handlers through Nest's own
execution pipeline, so a Telegram bot is structured, tested and scaled exactly
like any other Nest application.

If you already know NestJS, you already know Nestgram. A `@Router()` is a
controller, an incoming update is a request, and the value a handler returns is
the reply.

:::mental
Telegram update -> @Router() controller\* -> handler -> reply
:::

## Who it's for

Developers who know Node.js and NestJS and want to ship **serious,
production-grade bots** — including those who have never touched the Telegram
Bot API directly. You get Nest's DI, modules, guards, interceptors, pipes and
exception filters, pointed at Telegram instead of HTTP.

## The one principle

When developer experience and the internal purity of the framework conflict,
**developer experience wins.** This is Nest's own bargain: complex,
reflection-heavy internals in exchange for sterile, declarative application
code. We do the hard work inside the framework — discovery, rich event objects,
custom execution contexts, code generation — so your bot code stays minimal.

:::guardrail[only in Nestgram]
Nothing the framework does is off-limits. Auto-answering callbacks, the default
parse mode, the update source — every built-in is implemented on the **same
public extension points you get**. If a built-in doesn't fit, replace it; if a
feature is missing, write it at the same level the framework would.
:::

## What Nestgram is not

- Not a wrapper over `telegraf` / `grammY`.
- Not a custom "middleware" system parallel to Nest's primitives — cross-cutting
  concerns use guards, interceptors, pipes and exception filters.
- Not a hand-maintained list of API types — types and method classes are
  generated from a community spec.
- Not a beginner-programming tutorial framework — the audience is experienced
  Node/NestJS developers.

:::note
New here? Read the [mental model](/docs/mental-model) next, then run a real bot
in the [quickstart](/docs/quickstart).
:::

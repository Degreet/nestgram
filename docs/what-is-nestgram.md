---
title: What is Nestgram
description: A NestJS framework for Telegram bots — your bot isn't wired to Nest, it is a Nest app.
sidebar:
  group: Introduction
  order: 1
---

Nestgram is a framework for building Telegram bots on NestJS — not a wrapper
over `telegraf` or `grammY`. Your bot doesn't _integrate with_ Nest; it **is** a
Nest app. A `@Router()` is a controller, an incoming update is a request, and
the value a handler returns is the reply.

:::mental
Telegram update -> @Router() controller\* -> handler -> reply
:::

Handlers run through Nest's own `ExternalContextCreator`, so your guards,
interceptors, pipes, exception filters — and your DI — work on a bot handler
exactly as they do on an HTTP route. If you know Nest, you already know Nestgram.

The whole Bot API layer — types and method classes — is generated from a daily
re-scrape of the official docs, so it tracks Telegram automatically instead of
drifting out of date.

## When to choose it

Nestgram is for one situation in particular: **your backend is NestJS, and you
want the bot to be part of it** — injecting the same services, wrapped by the
same guards, covered by the same tests — instead of running a second, parallel
bot world. If you've felt double-tap races on session state, a silently dying
poll loop, or `429` flood limits in production, those are handled as defaults
here, not infrastructure you hand-roll.

## The one principle

When developer experience and the internal purity of the framework conflict,
**developer experience wins.** It's Nest's own bargain: complex,
reflection-heavy internals in exchange for minimal, declarative application code.
We do the hard work inside the framework — discovery, rich typed events, custom
execution contexts, code generation — so your bot code stays small.

:::guardrail[only in Nestgram]
Nothing the framework does is off-limits. Auto-answering callbacks, the default
parse mode, the update source — every built-in runs on the **same public
extension points you get**. If a built-in doesn't fit, replace it; if a feature
is missing, write it at the level the framework would.
:::

:::note
New here? Read the [mental model](/docs/mental-model) next, then run a real bot
in the [quickstart](/docs/quickstart).
:::

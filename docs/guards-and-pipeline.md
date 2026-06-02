---
title: Guards & the Nest pipeline
description: Restrict handlers with a standard Nest guard, and understand why the full Nest pipeline works unchanged.
sidebar:
  label: Guards & pipeline
  group: The Nest pipeline
  order: 60
---

This is the page that explains *why* Nestgram is a framework and not a
wrapper. Because handlers run through Nest's own execution pipeline, the
primitives you already know — **guards, interceptors, pipes and exception
filters** — work here exactly as they do in HTTP. Nothing custom to learn.

:::mental
update -> guard -> interceptor -> handler* -> filter
:::

## An admin-only guard

A guard is a standard Nest `CanActivate`. The only Nestgram-specific part is
reading the Telegram event off the `ExecutionContext`, which a small helper
does for you.

:::code[admin.guard.ts]{mark="9"}
```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegramExecutionContext } from 'nestgram';

const ADMINS = [123456789];

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { from } = TelegramExecutionContext.of(context);
    return from ? ADMINS.includes(from.id) : false;
  }
}
```
:::

`TelegramExecutionContext.of(context)` exposes `from`, `chat`, `event`,
`type` and `update` — the typed view of what's flowing through the pipeline.

## Applying it

Use the standard `@UseGuards()` — on a single handler or the whole router.

:::code[admin.router.ts]{mark="5"}
```ts
import { Router, Command, UseGuards, Message } from 'nestgram';
import { AdminGuard } from './admin.guard';

@Router()
@UseGuards(AdminGuard) // every handler in this router is admin-only
export class AdminRouter {
  @Command('broadcast')
  broadcast(message: Message) {
    return 'Broadcasting to all users…';
  }
}
```
:::

When the guard returns `false`, the handler never runs — same semantics as a
blocked HTTP route.

## The rest of the pipeline

Because it's the real Nest pipeline, the other primitives are already
available:

- **Interceptors** (`@UseInterceptors()`) — wrap handlers for logging,
  timing, or transforming the returned value before it's sent.
- **Pipes** (`@UsePipes()`) — validate and transform inputs; pair them with
  `class-validator` DTOs for structured payloads.
- **Exception filters** (`@Catch()`, `@UseFilters()`) — catch errors thrown
  in a handler and turn them into a friendly reply.

:::code[reply-on-error.filter.ts]
```ts
import { Catch, ExceptionFilter } from '@nestjs/common';
import { TelegramExecutionContext } from 'nestgram';

@Catch()
export class ReplyOnError implements ExceptionFilter {
  catch(error: unknown, host: ExecutionContext) {
    const { event } = TelegramExecutionContext.of(host);
    return event.answer('Something went wrong, please try again.');
  }
}
```
:::

:::tip
Cross-cutting concerns — auth, rate limits, logging, i18n — belong in
guards and interceptors, not copied into every handler. That's the whole
point of running on Nest's pipeline.
:::

## Production guardrails

A few framework-level safeguards worth knowing as you move past polling:

:::warn[Webhook without a secret token]
If you set a webhook **without** a secret token, anyone who learns your
webhook URL can post fake updates.
> Nestgram warns at startup and validates `X-Telegram-Bot-Api-Secret-Token` on every request when set
:::

Other production defaults Nestgram handles for you, no config required:

- **Startup health check** — a `getMe` call confirms the token and logs the
  bot you connected as.
- **Graceful shutdown** — in-flight updates drain instead of being dropped
  mid-handler.
- **Send throttling** — outgoing calls respect Telegram's rate limits and
  back off on `429 retry_after`.

## You've seen the framework

That's the core loop: routers as controllers, typed events, sugar where it
helps, and the full Nest pipeline around every handler. Everything else —
sessions, scenes, code-generated API types — builds on exactly these pieces.

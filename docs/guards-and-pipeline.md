---
title: Guards & the Nest pipeline
description: Guards, interceptors, pipes and exception filters wrap a handler exactly as they wrap an HTTP route — same primitives, no parallel middleware.
sidebar:
  label: Guards & pipeline
  group: The Nest pipeline
  order: 60
---

This is the page where "framework, not wrapper" stops being a slogan. Every
handler is invoked through Nest's own `ExternalContextCreator` — the same
machinery behind your HTTP controllers — so the primitives you already
know wrap a router method exactly as they wrap a route:

| Primitive        | Apply with                   | Runs                                  |
| ---------------- | ---------------------------- | ------------------------------------- |
| Guard            | `@UseGuards()`               | before the handler; `false` blocks it |
| Interceptor      | `@UseInterceptors()`         | around the handler, both sides        |
| Pipe             | `@UsePipes()`                | on params, before the handler         |
| Exception filter | `@Catch()` + `@UseFilters()` | when the handler (or pipeline) throws |

There is no Nestgram middleware system to learn. The `bot.use(...)` chain you'd
reach for in telegraf maps onto whichever of these four does the job.

:::mental
guards -> interceptors -> pipes -> handler -> exception filters
:::

## Reading the event off the context

A guard, interceptor or filter receives an `ExecutionContext`, not your typed
event. `TelegramExecutionContext.of(context)` unwraps it — the engine invokes
handlers as `invoker(event, ctx)`, so the wrapper sits at argument index 1, and
`.of()` reads it back.

| Accessor            | Is                                                     |
| ------------------- | ------------------------------------------------------ |
| `ctx.event`         | the rich typed event (`Message`, `CallbackQuery`, …)   |
| `ctx.message`       | the rich `Message` on a message update, or `undefined` |
| `ctx.callbackQuery` | the rich `CallbackQuery` on a callback, or `undefined` |
| `ctx.from`          | the `User` who triggered the update, or `undefined`    |
| `ctx.chat`          | the chat the update happened in, or `undefined`        |
| `ctx.kind`          | the resolved `UpdateKind`                              |
| `ctx.update`        | the raw, read-only update payload                      |
| `ctx.state`         | a per-update `Map` you can read and write              |

## An admin-only guard

A guard here is a stock Nest `CanActivate`. The only Telegram-specific line is
pulling `from` off the context.

:::code[admin.guard.ts]

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegramExecutionContext } from 'nestgram';

@Injectable()
export class AdminGuard implements CanActivate {
  private static readonly ADMINS = [123456789];

  canActivate(context: ExecutionContext): boolean {
    const id = TelegramExecutionContext.of(context).from?.id;
    return id !== undefined && AdminGuard.ADMINS.includes(id);
  }
}
```

:::

Apply it with `@UseGuards()` — on one method, or on the router to cover every
handler in it.

:::code[admin.router.ts]

```ts
import { UseGuards } from '@nestjs/common';
import { Router, Command, Message } from 'nestgram';
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
blocked HTTP route, and a different question from routing.

:::tip
A **match predicate** (`@Command`, `@Action`, `@Hears`) decides _which_ handler
runs; a **guard** decides whether the chosen handler is _allowed_ to run. Routing
picks the method, guarding admits the caller — see
[the mental model](/docs/mental-model) for why Nestgram keeps them separate.
:::

### Already have HTTP guards?

You don't rewrite them. A guard that reads `context.switchToHttp().getRequest()`
keeps working on your HTTP routes untouched — it just has nothing to read on a
Telegram update, so it doesn't belong on a router. Telegram routes get Telegram
guards, like the one above.

For a guard you want on **both** worlds — shared auth, say — branch on the
context type. Nestgram tags its updates, so `getType()` tells you where you are:

:::code[admin.guard.ts]

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegramExecutionContext } from 'nestgram';

const ADMIN_IDS = new Set<number>([123456789]);

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const userId =
      context.getType<'http' | 'telegram'>() === 'telegram'
        ? TelegramExecutionContext.of(context).from?.id
        : context.switchToHttp().getRequest<{ user?: { id: number } }>().user
            ?.id;

    return userId !== undefined && ADMIN_IDS.has(userId);
  }
}
```

:::

The transport-specific lines just pull out the identity; keep the **decision**
in a shared service so it's written once — the same split you'd use across HTTP
and a microservice.

## Interceptors wrap the handler

An interceptor is a stock `NestInterceptor`. It sees the call going in and the
returned value coming out — log it, time it, or transform the reply before the
result handler sends it.

:::code[logging.interceptor.ts]

```ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { TelegramExecutionContext } from 'nestgram';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Update');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = TelegramExecutionContext.of(context);
    const who = ctx.from ? `@${ctx.from.username ?? ctx.from.id}` : 'unknown';
    const startedAt = Date.now();

    this.logger.log(`${ctx.kind} from ${who}`);
    return next
      .handle()
      .pipe(
        tap(() => this.logger.log(`handled in ${Date.now() - startedAt}ms`)),
      );
  }
}
```

:::

Register it with `@UseInterceptors(LoggingInterceptor)` on a method or router,
or globally via `APP_INTERCEPTOR` — the standard three scopes, unchanged.

:::note
Nestgram's own conveniences — auto-answering callbacks, the default parse mode,
rich-message coercion, send throttling — _are_ ordinary interceptors and filters,
registered globally by `NestgramModule`. There is no privileged core: the
auto-answer behaviour is an interceptor you could have written, and you can
[replace any of them](/docs/extending).
:::

## Pipes validate params

Pipes run on the values your param decorators resolve. A `@Param()` captured by
`@Command('add :amount')` arrives as a string; pair the param with a stock pipe
to coerce or validate it before the handler body.

:::code[amount.router.ts]

```ts
import { ParseIntPipe } from '@nestjs/common';
import { Router, Command, Message, Param } from 'nestgram';

@Router()
export class AmountRouter {
  @Command('add :amount')
  add(message: Message, @Param('amount', ParseIntPipe) amount: number) {
    return message.answer(`Adding ${amount}.`);
  }
}
```

:::

If `ParseIntPipe` rejects, it throws before your handler runs — and the next
section is where that throw lands.

## Reply by throwing

The Telegram counterpart of `throw new HttpException(...)` is
`throw new ReplyException(...)`. Throw it from a guard, pipe, interceptor or the
handler itself to short-circuit the pipeline and answer the originating chat.
A built-in global `@Catch(ReplyExceptionBase)` filter — `ReplyExceptionFilter`,
registered by `NestgramModule` as an `APP_FILTER` — maps it to the reply and
consumes the exception, so the dispatcher sees a clean completion with no error
log.

:::code[admin.guard.ts]

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegramExecutionContext, ReplyException } from 'nestgram';

@Injectable()
export class AdminGuard implements CanActivate {
  private static readonly ADMINS = [123456789];

  canActivate(context: ExecutionContext): boolean {
    const id = TelegramExecutionContext.of(context).from?.id;
    if (id !== undefined && AdminGuard.ADMINS.includes(id)) return true;
    throw new ReplyException('Only admins can do that.');
  }
}
```

:::

The string is sent exactly as a returned `string` would be — `ReplyException`
mirrors the handler return-value contract, so it also takes options or a command
object (`new SendMessage(...)`). For everything beyond this — catching your own
domain errors, the typed `ApiException` predicates — see
[Handling errors](/docs/handling-errors).

## A catch-all filter

A `@Catch()` filter with no argument fires for _any_ thrown error, on _any_
update kind. That width is the catch: `ctx.event` arrives as the wide event
union, so narrow it before you reach for kind-specific sugar.

:::code[reply-on-error.filter.ts]

```ts
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Message, TelegramExecutionContext } from 'nestgram';

@Catch()
export class ReplyOnError implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const { event } = TelegramExecutionContext.of(host);
    if (event instanceof Message) {
      return event.answer('Something went wrong, please try again.');
    }
  }
}
```

:::

:::anno

1. The filter takes `ArgumentsHost`, not `ExecutionContext` — that's the supertype Nest hands a filter, and `TelegramExecutionContext.of()` accepts it so the same unwrap works.
2. `event instanceof Message` narrows the union to one kind; only after it can you call `answer()`. A callback-query update would skip the branch.
3. Returning a value sends it as the reply, just like a handler's return — the filter is on the same result contract.

:::

## Why this matters

Cross-cutting concerns — auth, rate limits, logging, i18n, error mapping — live
in guards, interceptors, pipes and filters, never copied into every handler.
That is the whole payoff of running on `ExternalContextCreator`: the pipeline
you reason about for an HTTP route is the pipeline that runs here. From this
base, [Handling errors](/docs/handling-errors) goes deep on the filter side,
[Send throttling](/docs/throttling) on the outbound throttle interceptor, and
[Rate limiting](/docs/rate-limiting) on capping inbound updates.

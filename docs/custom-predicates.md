---
title: Custom predicates
description: Implement the RoutePredicate contract to route on anything in an update — the same seam the built-ins use, built once at boot.
sidebar:
  group: Routing
  order: 23
---

`@Command`, `@Hears` and `@Action` aren't special. Each one is a class
implementing a public `RoutePredicate`, handed to a listener decorator. When the
built-ins don't cover the shape you need to route on, you write your own against
the same contract — and it runs at exactly the stage the framework's own
predicates do.

:::mental
listener decorator -> predicate at boot -> matches(ctx) per update -> next handler or run
:::

## The contract

A predicate answers one question: _does this route apply to the current update?_
It reads the execution context and returns a boolean, sync or async.

:::code[route-predicate.ts]

```ts
import type { TelegramExecutionContext } from 'nestgram';

// The contract, exported from 'nestgram' — you implement it on a class.
interface RoutePredicate {
  matches(ctx: TelegramExecutionContext): boolean | Promise<boolean>;
}
```

:::

This is **routing**, not guarding. A `false` here tells the dispatcher to try the
next handler; it doesn't reject the update the way a guard's `false` does. The
predicates are instantiated once when `DiscoveryService` builds the boot-time
route table, then reused for every update — so a predicate instance is shared,
keep it stateless.

The context hands you three views of the same update:

| Accessor     | What you get                                         |
| ------------ | ---------------------------------------------------- |
| `ctx.update` | the raw `Update` Telegram sent, `Readonly`           |
| `ctx.kind`   | the resolved `UpdateKind` (`resolveKind`'s whitelist)|
| `ctx.event`  | the rich typed event (`Message`, `CallbackQuery`, …) |
| `ctx.chat`   | the `Chat` the update happened in, if any            |
| `ctx.from`   | the `User` who triggered it, if any                  |

`ctx.event` is built lazily and cached; reach for `ctx.update` when you only need
a raw field and want to skip building the rich event.

## Writing one

Say you want a handler that only fires in private chats. Implement `matches`,
read what you need off the context, return a boolean.

:::code[private-chat.predicate.ts]

```ts
import { RoutePredicate, TelegramExecutionContext } from 'nestgram';

export class PrivateChatPredicate implements RoutePredicate {
  matches(ctx: TelegramExecutionContext): boolean {
    return ctx.chat?.type === 'private';
  }
}
```

:::

You register it by passing an instance to a listener decorator. Extra predicates
**all** have to pass — they compose as a logical AND, narrowing the route:

:::code[dm.router.ts]

```ts
import { Router, OnMessage, Message } from 'nestgram';
import { PrivateChatPredicate } from './private-chat.predicate';

@Router()
export class DmRouter {
  @OnMessage(new PrivateChatPredicate())
  dmOnly(message: Message) {
    return 'This only runs in private chats.';
  }
}
```

:::

:::tip
Wrap the predicate in a one-line decorator for a cleaner call site — a decorator
is just a function that forwards your predicate to the listener:

```ts
import { OnMessage } from 'nestgram';
import { PrivateChatPredicate } from './private-chat.predicate';

export const PrivateChat = () => OnMessage(new PrivateChatPredicate());
```

:::

## Feeding `@Param` from a predicate

The built-in `@Param('id')` doesn't read the route template directly — it asks
the predicate that matched for its captured segments. A predicate opts into that
by also implementing `RouteParamSource`: return a `Record<string, string>` of
named segments, or `null` when this update didn't match through it.

`@Param('name')` walks the matched handler's predicates, calls `extractParams`,
and reads the named key — so the same `@Param` you already use on `@Command` and
`@Action` works against your predicate with no extra wiring.

:::code[locale-prefix.predicate.ts]

```ts
import {
  RoutePredicate,
  RouteParamSource,
  TelegramExecutionContext,
} from 'nestgram';

// Matches a message like `en:reset` and exposes the `lang` segment to @Param.
export class LocalePrefixPredicate
  implements RoutePredicate, RouteParamSource
{
  private static readonly PATTERN = /^(?<lang>[a-z]{2}):reset$/;

  matches(ctx: TelegramExecutionContext): boolean {
    return this.extractParams(ctx) !== null;
  }

  extractParams(ctx: TelegramExecutionContext): Record<string, string> | null {
    const text = ctx.update.message?.text;
    if (text === undefined) {
      return null;
    }

    return text.match(LocalePrefixPredicate.PATTERN)?.groups ?? null;
  }
}
```

:::

:::code[locale.router.ts]

```ts
import { Router, OnMessage, Param, Message } from 'nestgram';
import { LocalePrefixPredicate } from './locale-prefix.predicate';

@Router()
export class LocaleRouter {
  @OnMessage(new LocalePrefixPredicate())
  reset(message: Message, @Param('lang') lang: string) {
    return `Resetting locale to ${lang}.`;
  }
}
```

:::

:::anno
`matches` and `extractParams` read the same regex, so `matches` just checks
whether the capture succeeded — one source of truth for what the route accepts.
:::

If your predicate captures with a regex and you'd rather take the whole
`RegExpMatchArray` by index than name every group, implement `RegexMatchSource`
instead — `extractMatch(ctx)` returns the array (or `null`), and `@Matches()`
injects it. Named groups on that array still surface through `@Param`. This is
exactly how a regex `@Hears(/add (\d+)/)` feeds both `@Matches()` and
`@Param('amount')`.

| Implement…         | …to inject via | You return                       |
| ------------------ | -------------- | -------------------------------- |
| `RoutePredicate`   | (routing only) | `boolean \| Promise<boolean>`    |
| `RouteParamSource` | `@Param('id')` | `Record<string, string> \| null` |
| `RegexMatchSource` | `@Matches()`   | `RegExpMatchArray \| null`       |

:::caution
Keep `matches` pure and fast. It runs during routing, before the Nest pipeline,
and may be evaluated across several candidate handlers per update. A DB lookup or
a network call belongs in a guard or the handler — not in a predicate, and never
in a field on the shared instance.
:::

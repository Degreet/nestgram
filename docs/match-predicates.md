---
title: Matching text & content
description: Route on message text and callback data with @Hears and @Match, then read regex captures with @Matches and @Param.
sidebar:
  group: Routing
  order: 21
---

A listener decorator picks the update _type_; a match predicate decides
**whether this handler is the one** for that update's content. `@OnMessage()`
takes any message; `@Hears(/^\d+$/)` takes only the ones whose text is a number.
This page is the content layer: matching message text and callback data, ANDing
extra conditions onto a handler, and reading what a regex captured.

This is **routing**, not guarding. A predicate that returns `false` makes the
dispatcher try the next handler; a guard's `false` rejects the update. Same
distinction the [mental model](/docs/mental-model) draws — keep it in mind, it
decides where each check belongs.

| Decorator                          | Matches on                       | `false` means          |
| ---------------------------------- | -------------------------------- | ---------------------- |
| `@Hears('hi')`                     | `message.text`, exact            | try the next handler   |
| `@Hears(/^\d+$/)`                  | `message.text`, regex `.test()`  | try the next handler   |
| `@Action('buy')` / `@Action(/…/)`  | `callback_query.data`            | try the next handler   |
| `@Match(pred)`                     | a condition you write, ANDed in  | try the next handler   |

`@Action` and the callback route templates live on the [callbacks](/docs/callbacks)
page; here we focus on `@Hears`, `@Match`, and reading captures.

## Text with @Hears

`@Hears` reads `message.text`. A string matches it exactly; a `RegExp` is tested
against it. Nothing else about the message is inspected — a message with no text
(a photo, a sticker) never matches.

:::code[support.router.ts]

```ts
import { Router, Hears, Message } from 'nestgram';

@Router()
export class SupportRouter {
  @Hears('ping')
  ping(message: Message) {
    return 'pong';
  }

  @Hears(/^\d+$/)
  number(message: Message) {
    return `That's a number: ${message.text}`;
  }
}
```

:::

A subtle one worth naming: a `g` or `y` flag on your regex is **stripped** when
the predicate is built. Predicates are constructed once at boot and reused for
every update, and a global regex advances `lastIndex` between `.test()` calls —
so the same pattern would match, then miss, then match across successive
messages. Nestgram removes `g`/`y` so matching stays stateless. Write the flag
or don't; the behavior is the same.

:::mental
message.text -> string equals OR regex .test() -> this handler, or the next
:::

## AND a condition with @Match

`@Hears` and `@Action` match on _one_ field. When you need "this text **and**
this other condition", reach for `@Match`. It ANDs one or more predicates into
**every route the handler declares** — across all its listener decorators at
once. A predicate is just an object with a `matches(ctx)` method returning a
boolean (sync or async): the same public `RoutePredicate` contract the built-ins
use, nothing privileged.

:::code[dm-number.router.ts]

```ts
import {
  Router,
  Hears,
  Match,
  Message,
  RoutePredicate,
  TelegramExecutionContext,
} from 'nestgram';

const inPrivateChat: RoutePredicate = {
  matches(ctx: TelegramExecutionContext) {
    return ctx.chat?.type === 'private';
  },
};

@Router()
export class DmNumberRouter {
  @Hears(/^\d+$/)
  @Match(inPrivateChat) // text is a number AND the chat is private
  number(message: Message) {
    return `Got ${message.text} in a DM.`;
  }
}
```

:::

Where extra predicates passed to a single listener (`@OnMessage(a, b)`) narrow
that one route, `@Match` narrows the **whole handler** regardless of how many
update types it listens to — which is why it can sit over a handler that fans
out across types:

:::code[admin.router.ts]

```ts
import {
  Router,
  OnMessage,
  OnCallbackQuery,
  Match,
  Message,
  CallbackQuery,
  RoutePredicate,
} from 'nestgram';

const ADMIN_ID = 1234567;

const fromAdmin: RoutePredicate = {
  matches: (ctx) => ctx.from?.id === ADMIN_ID,
};

@Router()
export class AdminRouter {
  @OnMessage()
  @OnCallbackQuery()
  @Match(fromAdmin) // (message OR callback) AND fromAdmin
  handle(event: Message | CallbackQuery) {
    // ...
  }
}
```

:::

:::tip
Placement is free: `@Match` lives under a separate metadata key and is merged
into the routes at boot, so it behaves the same above or below the listener
decorators. Used **alone** — no listener decorator — it's a no-op; there's no
route to narrow. For the full contract and writing reusable predicate
decorators, see [custom predicates](/docs/custom-predicates).
:::

## Read regex captures

A regex `@Hears` (or `@Action`) doesn't just match — it **captures**. Read the
groups instead of re-parsing the text by hand.

`@Matches()` injects the whole `RegExpMatchArray` from the regex route that
matched, so positional groups come back by index. The capture is run lazily —
the routing path stays a cheap boolean `.test()`, and the allocating `.match()`
fires only because a parameter actually reads it.

:::code[calc.router.ts]

```ts
import { Router, Hears, Matches, Message } from 'nestgram';

@Router()
export class CalcRouter {
  @Hears(/^add (\d+) (.+)$/)
  add(message: Message, @Matches() match: RegExpMatchArray) {
    return `Added ${match[1]}: ${match[2]}`;
  }
}
```

:::

`match[0]` is the whole match, `match[1..]` the positional groups,
`match.groups` the named ones. Extraction runs against the regex of the route
that _actually_ matched, so a sibling route the matcher only evaluated never
bleeds in. When the handler matched through a non-regex route — a string
`@Hears`, a `@Command`, a custom predicate — there's no match to read, and
`@Matches()` resolves to `undefined`.

For a **single** named value, prefer `@Param` over indexing the array. Name the
group `(?<amount>\d+)` and it flows into `@Param('amount')` with a per-parameter
pipe — exactly like a `@Command('add :amount')` segment:

:::code[calc.router.ts]

```ts
import { Router, Hears, Param, Message } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class CalcRouter {
  @Hears(/^add (?<amount>\d+)$/)
  add(message: Message, @Param('amount', ParseIntPipe) amount: number) {
    return `Added ${amount}`;
  }
}
```

:::

Because a `@Command` template segment and a regex named group feed the **same**
`@Param`, one handler can accept either spelling through a single parameter —
the slash command `/add 5` or the plain text `add 5`:

:::code[calc.router.ts]

```ts
import { Router, Command, Hears, Param, Message } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class CalcRouter {
  @Command('add :amount')
  @Hears(/^add (?<amount>\d+)$/)
  add(message: Message, @Param('amount', ParseIntPipe) amount: number) {
    return `Added ${amount}`;
  }
}
```

:::

:::tip
Reach for `@Matches()` when you want several positional groups at once; reach
for a named group + `@Param` when you want one value, typed and validated by a
pipe. Don't mix `match[1]` indexing with a named-group regex — name the groups
and let `@Param` read them.
:::

## First match wins

Within a router, the boot-time route table is walked in **method-declaration
order**, and the **first** handler whose predicate matches runs — the rest are
never tried. Put specific handlers before catch-alls.

:::code[order.router.ts]

```ts
import { Router, Hears, OnMessage, Message } from 'nestgram';

@Router()
export class OrderRouter {
  @Hears(/^\d+$/) // specific: checked first
  number(message: Message) {
    return `Number: ${message.text}`;
  }

  @OnMessage() // catch-all: only if nothing above matched
  fallback(message: Message) {
    return message.text;
  }
}
```

:::

:::caution
Ordering is reliable **within a single router** (method-declaration order).
Across routers it's undefined — keep a content handler and its catch-all in the
same router when precedence matters.
:::

---
title: Commands & parameters
description: Parse commands as routes, pull typed values with @Param, and read derived data through the parameter-decorator catalogue.
sidebar:
  label: Commands & params
  group: Routing
  order: 24
---

A command is a route. `@Command('add :amount :note...')` reads like
`@Get('order/:count')` — name the segments in the template, pull each one with
`@Param`, and let a pipe decode and validate it. Everything else a handler needs
that isn't the main event — the sender, the chat, a callback's data — comes in
through a **parameter decorator**, a named read of something the update already
carries.

## Commands as routes

`@Command('start')` matches `/start`. To read arguments, name them in the
template: `:param` captures one token, a trailing `:rest...` captures the
remainder, and `@Param()` hands you each segment. A pipe decodes it the
Nest-native way — the same `ParseIntPipe` you'd put on `@Get('order/:count')`:

:::code[order.router.ts]

```ts
import { Router, Command, Message, Param } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class OrderRouter {
  // /order 3 large
  @Command('order :count :size')
  order(
    message: Message,
    @Param('count', ParseIntPipe) count: number,
    @Param('size') size: string,
  ) {
    return `Ordering ${count} × ${size} size`;
  }
}
```

:::

The compiled template lives in `CommandRoutePattern`; `CommandPredicate` runs it
per update — first a cheap command-name check, then `matchArgs` captures the
segments. Those captures are the same thing `@Param` reads back, because the
predicate is also a `RouteParamSource`.

:::mental
`@Command('order :count :size')` -> match + capture -> `@Param('count')`
:::

### Exact-arity matching

Matching is **exact-arity**: `@Command('order :count :size')` matches `/order`
with exactly two arguments — never a bare `/order`, never three. That makes two
templates for the same command **disjoint by shape**, so the message's argument
count selects the handler the way a path selects an HTTP controller method:

:::code[todo.router.ts]

```ts
import { Router, Command, Message, Param } from 'nestgram';
import { ParseIntPipe } from '@nestjs/common';

@Router()
export class TodoRouter {
  // /add 3 buy oat milk → amount 3, note "buy oat milk"
  @Command('add :amount :note...')
  add(
    message: Message,
    @Param('amount', ParseIntPipe) amount: number,
    @Param('note') note: string,
  ) {
    return `Added ${amount} × "${note}"`;
  }

  // /add 3 → a different handler, chosen by argument count
  @Command('add :amount')
  quickAdd(message: Message, @Param('amount', ParseIntPipe) amount: number) {
    return `Added ${amount}`;
  }
}
```

:::

`matchArgs` returns `null` unless the token count fits the segment count exactly,
so `/add 3 buy oat milk` can only land on `add`, and `/add 3` only on `quickAdd`.
A bare `@Command('add')` — no segments — matches `/add` with no arguments at all.

### Greedy and prefixed segments

A trailing `:note...` is **greedy** — it captures one or more tokens and joins
them back into a single value, so free text survives intact. It must be the last
segment (the compiler rejects a greedy parameter anywhere else).

A segment can also carry a **literal prefix**: `ref_:code` matches a token that
starts with `ref_` and captures the part after it, so `@Param('code')` gets just
the suffix. A bare `:code` captures the whole token.

| Template segment | Matches a token like | `@Param` value                  |
| ---------------- | -------------------- | ------------------------------- |
| `:amount`        | `3`                  | `'3'`                           |
| `ref_:code`      | `ref_42`             | `'42'`                          |
| `:note...`       | `buy oat milk`       | `'buy oat milk'` (rest, joined) |

A value that doesn't fit its pipe throws — `ParseIntPipe` on `/add abc` raises,
and an exception filter turns that into a usage reply. No `split`, no index, no
`Number(...)` of your own.

:::tip
When you only want the unstructured token list, `@Args()` gives the
whitespace-split arguments after the command (`string[]`) and `@Payload()` the
raw text remainder. Reach for the template-and-`@Param` route first — it's typed
and validated; `@Args`/`@Payload` are the raw fallback.
:::

### /start and deep-link payloads

`@OnStart()` is sugar for `@Command('start ...')`. With no argument it matches a
bare `/start` — the welcome screen. Pass a payload route and it handles a deep
link (`t.me/bot?start=ref_42` arrives as `/start ref_42`):

:::code[welcome.router.ts]

```ts
import { Router, OnStart, Message, Param } from 'nestgram';

@Router()
export class WelcomeRouter {
  @OnStart()
  welcome(message: Message) {
    return 'Welcome! Send /help to see what I can do.';
  }

  // t.me/yourbot?start=ref_42 → /start ref_42 → code "42"
  @OnStart('ref_:code')
  referred(message: Message, @Param('code') code: string) {
    return `Thanks for joining via referral ${code}!`;
  }
}
```

:::

Because the routes are exact-arity and disjoint, the bare `@OnStart()` never
swallows a `/start` that carries a payload — the deep-linked variant wins by
shape. Build the matching link with the `deepLink()` helper:
`deepLink('yourbot', { start: 'ref_42' })`. `@OnHelp()` is the same sugar for
`/help`.

## The parameter-decorator catalogue

The main event is always the bare typed first argument — no decorator. Parameter
decorators are for the **derived or cross-cutting** values: things you _could_
dig out of the event, but want named directly. Each one is a named read of
something the update already carries.

:::code[whoami.router.ts]

```ts
import { Router, Command, Sender, Chat, User, RawChat } from 'nestgram';

@Router()
export class WhoAmIRouter {
  @Command('whoami')
  whoami(@Sender() user: User, @Chat() chat: RawChat) {
    return `You are ${user.first_name} (id ${user.id}) in chat ${chat.id}`;
  }
}
```

:::

| Decorator              | Gives you                                          | Type                   |
| ---------------------- | -------------------------------------------------- | ---------------------- |
| `@Param('name', Pipe)` | a named segment captured from the matched route    | `string` (piped)       |
| `@Matches()`           | the whole `RegExpMatchArray` from a regex route    | `RegExpMatchArray`     |
| `@Sender()`            | the `User` who triggered the update                | `User \| undefined`    |
| `@Chat()`              | the chat the update happened in                    | `RawChat \| undefined` |
| `@Args()`              | raw whitespace-split arguments after the command   | `string[]`             |
| `@Payload()`           | raw text remainder after the command               | `string \| undefined`  |
| `@Text()`              | the message's plain text (`message.text`)          | `string \| undefined`  |
| `@Caption()`           | the message's media caption (`message.caption`)    | `string \| undefined`  |
| `@CallbackData()`      | a callback query's `data` string                   | `string \| undefined`  |
| `@Locale()`            | the update's resolved locale                       | `string \| undefined`  |
| `@Session()`           | the per-update session object                      | your session type      |
| `@State()`             | the per-update state store (lives for this update) | `Map`-like store       |

A few only resolve when their feature is wired: `@Session()` needs the session
module, `@Locale()` needs i18n — both come back `undefined` otherwise. `@Param`
and `@Matches` read the captures of the route that **actually matched**, so a
sibling route the matcher only evaluated never bleeds in.

:::note
A parameter decorator never collides with a type name — `@Sender()` is the
decorator, `User` is the type, and you import both. That collision is exactly
what keeping the main event positional avoids.
:::

### @Param vs @Matches

Both read captures, from different route kinds. `@Param('amount')` reads a named
segment — from a `@Command('add :amount')` template, or a named regex group
(`match.groups.amount`) — and runs your pipe. `@Matches()` hands you the whole
`RegExpMatchArray` so you read positional groups by index:

:::code[regex.router.ts]

```ts
import { Router, Hears, Message, Matches } from 'nestgram';

@Router()
export class RegexRouter {
  @Hears(/^add (\d+) (.+)$/)
  add(message: Message, @Matches() match: RegExpMatchArray) {
    const amount = Number(match[1]);
    const note = match[2];
    return `Added ${amount} × "${note}"`;
  }
}
```

:::

Prefer `@Param` for a named capture — it's typed through a pipe and reads the
same whether the route is a `@Command` template or a named regex group. Reach for
`@Matches` only when you want positional groups or the raw match array. The regex
predicates themselves (`@Hears`, regex `@Action`) live in
[Match predicates →](/docs/match-predicates).

## Where this goes next

- Buttons, callback routing and `@CallbackData` in context →
  [Keyboards](/docs/keyboards).
- The other route predicates — `@Hears`, `@Action`, custom matchers →
  [Match predicates](/docs/match-predicates).

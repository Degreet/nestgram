---
title: Match predicates
description: Route by content with @Command, @Hears and @Action — distinct from guards, with first-match ordering.
sidebar:
  group: Routing
  order: 21
---

Match predicates decide **which handler applies** to an update. They sit on top
of the update type: `@OnMessage()` matches any message, while `@Command`,
`@Hears` and `@Action` match by content.

| Decorator                                 | Matches                                       |
| ----------------------------------------- | --------------------------------------------- |
| `@Command('start')`                       | `/start` (no args), `/start@BotName`          |
| `@Command('add :amount')`                 | `/add 5` — one argument, captured by `@Param` |
| `@Hears('hi')` / `@Hears(/^\d+$/)`        | message text by string or regex               |
| `@Action('buy')` / `@Action(/buy:(\d+)/)` | `callback_query.data` by string or regex      |
| `@OnMessage()` / `@On*()`                 | any update of that type                       |

## Commands

`@Command('start')` matches the `/start` command. It's **exact-arity**: a bare
`@Command('start')` matches `/start` with **no** arguments (and an optional
`@BotName` suffix Telegram adds in groups). To accept arguments, name them in
the template — `@Command('add :amount')` — and read them with `@Param()`; see
[Commands & keyboards](/docs/commands-and-keyboards). The name is given
**without** the leading slash.

:::code[support.router.ts]

```ts
@Router()
export class SupportRouter {
  @Command('start')
  start(message: Message) {
    return 'Welcome! Send /help to see what I can do.';
  }

  @Command('help')
  help(message: Message) {
    return 'Commands: /start, /help, /status';
  }
}
```

:::

## Text with @Hears

`@Hears` matches free text — a string for an exact match, or a `RegExp` to test
against the message text.

:::code

```ts
@Hears('ping')
ping(message: Message) {
  return 'pong';
}

@Hears(/^\d+$/)
number(message: Message) {
  return `That's a number: ${message.text}`;
}
```

:::

## Callback data with @Action

`@Action` matches inline-button presses by their `callback_query.data`. With no
argument it matches any callback query. See [callbacks](/docs/callbacks) for the
full flow.

:::code

```ts
@Action('refresh')
refresh(query: CallbackQuery) {
  return query.answer('Refreshed');
}
```

:::

## Reading regex captures

A regex `@Hears` or `@Action` can **capture** — read the groups instead of
re-parsing the text yourself. `@Matches()` injects the whole `RegExpMatchArray`,
so positional groups come back by index (`match[1]`, `match[2]`):

:::code[calc.router.ts]

```ts
@Hears(/^add (\d+) (.+)$/)
add(message: Message, @Matches() match: RegExpMatchArray) {
  return `Added ${match[1]}: ${match[2]}`;
}
```

:::

Prefer a **named group** for a single value with a pipe — it flows into
`@Param()` exactly like a `@Command('add :amount')` segment:

:::code[calc.router.ts]

```ts
@Hears(/^add (?<amount>\d+)$/)
add(message: Message, @Param('amount', ParseIntPipe) amount: number) {
  return `Added ${amount}`;
}
```

:::

Because the `@Command` template and a regex named group feed the **same**
`@Param`, one handler accepts either spelling — `/add 5` or `add 5` — through a
single parameter:

:::code[calc.router.ts]

```ts
@Command('add :amount')
@Hears(/^add (?<amount>\d+)$/)
add(message: Message, @Param('amount', ParseIntPipe) amount: number) {
  return `Added ${amount}`;
}
```

:::

## First match wins

Within a router, Nestgram tries handlers in **declaration order** and runs the
**first** whose predicate matches. Put specific handlers before catch-alls.

:::code[order.router.ts]{mark="3"}

```ts
@Router()
export class OrderRouter {
  @Command('start') // specific: checked first
  start(message: Message) {
    return 'Hi!';
  }

  @OnMessage() // catch-all: only if nothing above matched
  fallback(message: Message) {
    return message.text;
  }
}
```

:::

:::caution
Ordering is reliable **within a single router** (method declaration order).
Across different routers the order is not guaranteed — keep a command and its
catch-all in the same router if precedence matters.
:::

## Not a guard

A predicate returning `false` makes Nestgram **try the next handler**. A guard
returning `false` **rejects** the update. Use predicates to choose a handler and
[guards](/docs/guards-and-pipeline) to authorize the chosen one — they're different jobs.

:::guardrail[only in Nestgram]
Match predicates are first-class routing, not bolted onto exception filters or
guards. You can even write your own — see
[custom predicates](/docs/custom-predicates).
:::

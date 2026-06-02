---
title: Extending Nestgram
description: No privileged core — add custom matching, swap the update source, share per-update state, or replace a built-in.
sidebar:
  group: Concepts
  order: 121
---

Nestgram's own behaviours are built on the **same public extension points it
gives you**. If a feature doesn't exist, you can usually write it at the level
the framework would — no fork required.

## Custom match predicates

`@Command`/`@Action`/`@Hears` are `RoutePredicate`s. Implement your own to route
on anything in the update:

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

Pass it to any listener (all predicates must pass):
`@OnMessage(new PrivateChatPredicate())`. See [custom predicates](/docs/custom-predicates).

## Per-update state

Every update carries a `state` store — a place to stash your own flags or
context and read them back anywhere in the pipeline (a guard writes, an
interceptor or handler reads). It lives for that one update, then is discarded.

:::code
```ts
// in a guard:
TelegramExecutionContext.of(context).state.set('isAdmin', true);

// in the handler — inject it with @State():
@OnMessage()
handle(message: Message, @State() state: EventState) {
  if (state.get('isAdmin')) { /* ... */ }
}
```
:::

:::guardrail[only in Nestgram]
This is exactly how the built-in auto-answer works: `query.answer()` records into
the per-update state, and the interceptor reads `query.isAnswered`. Nothing
hidden — you could write that interceptor yourself with the same public API.
:::

## Swap the update source

`polling: true` is one implementation of a small `UpdateSource` interface
(`start(onUpdate)` / `stop()`). Provide your own to pull updates from anywhere —
a queue, a test harness, a custom transport — without touching a single handler.

## Replace a built-in

The conveniences are ordinary providers. Auto-answer is a global interceptor you
can disable (`autoAnswerCallbackQueries: false`, or `@NoAutoAnswer()` per
handler) and replace with your own; the default parse mode is a send hook you can
override per call. Turn any of them off and drop in your own at the same level.

:::tip
The rule of thumb: if a built-in doesn't fit, you don't fork Nestgram — you
disable it and register your own guard / interceptor / predicate / source. The
engine is what you configure; everything on top of it is a plugin you own.
:::

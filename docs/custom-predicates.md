---
title: Custom predicates
description: Write your own RoutePredicate to match updates however you need — the same contract the built-ins use.
sidebar:
  group: Routing
  order: 23
---

`@Command`, `@Hears` and `@Action` are not special. They're built on a public
`RoutePredicate` contract, and you can implement your own to route on anything
in the update.

## The contract

A predicate decides whether a route applies to the current update. It receives
the execution context and returns a boolean (sync or async):

:::code[route-predicate.ts]

```ts
interface RoutePredicate {
  matches(ctx: TelegramExecutionContext): boolean | Promise<boolean>;
}
```

:::

The context exposes the raw `update`, the resolved `kind`, and the rich `event`,
so a predicate can match on anything Telegram sent.

## Example: match by chat type

Say you want a handler that only fires in private chats:

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

Predicates compose: pass extra ones to a listener decorator and **all** must
pass (logical AND).

:::code

```ts
@OnMessage(new PrivateChatPredicate())
dmOnly(message: Message) {
  return 'This only runs in private chats.';
}
```

:::

:::tip
Wrap a predicate in your own decorator for a clean call site:
`@PrivateChat()` reading nicer than `@OnMessage(new PrivateChatPredicate())`.
A decorator is just a function that calls the listener decorator with your
predicate.
:::

:::guardrail[only in Nestgram]
The routing layer is yours to extend. A custom predicate runs at exactly the
same stage as the built-in ones — there's no privileged core that matching can
do but your code can't.
:::

:::caution
Keep predicates pure and fast: they run during routing, before the Nest
pipeline, and may be evaluated across several candidate handlers per update.
Heavy work (DB lookups, network) belongs in a guard or the handler, not a
predicate.
:::

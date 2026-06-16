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
interceptor or handler reads). It lives for that one update, then is discarded
— state that must survive between updates is a [session](/docs/sessions).

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
(`start(onUpdate)` / `stop()`). Plug in your own with the `source` factory to
pull updates from anywhere — a message queue, a test harness, a custom transport
— or to **decorate** the built-in one, without touching a single handler.

The factory runs once per bot and receives the transport the framework would
otherwise use (`default`), the bot it serves, and a DI lookup:

```ts
// A decorator: holds the built-in source, intercepts each update.
class LoggingSource implements UpdateSource {
  constructor(private inner: UpdateSource) {}
  start(onUpdate: UpdateListener) {
    return this.inner.start((update) => {
      console.log('update', update.update_id);
      return onUpdate(update);
    });
  }
  stop() {
    return this.inner.stop();
  }
}

NestgramModule.forRoot({
  token: process.env.BOT_TOKEN,
  webhook: { url, secretToken },
  source: ({ default: inner, bot, get }) => {
    // Wrap the built-in source to add a layer…
    return new LoggingSource(inner!);

    // …or ignore `inner` and replace ingestion entirely:
    // return new KafkaUpdateSource(get(KafkaService), bot);
  },
});
```

- **Wrap** — return a decorator that holds `inner`, forwarding `start`/`stop` and
  intercepting `onUpdate` (e.g. to enqueue, batch, filter, or trace). The
  framework's own update queue is exactly this — a decorator you could write.
- **Replace** — ignore `inner` and return your own `UpdateSource`. The
  `polling`/`webhook` config then only seeds `default`; if you replace a webhook
  source you also own delivery (register your own receiver) — and drop the
  ready-made `WebhookController`, since it delivers to the built-in source you
  replaced, which is never started (updates would be silently dropped).
- **Per bot** — branch on `ctx.bot.name` in a multi-bot app; the factory is
  called for each bot with its own `default` and `bot`.

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

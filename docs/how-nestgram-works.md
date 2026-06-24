---
title: How Nestgram works
description: The design behind the framework — layers, the update pipeline, and why it leans on real Nest primitives.
sidebar:
  group: Concepts
  order: 120
---

You can build bots without reading this page. But understanding the design tells
you _where_ to reach when you need something the guides didn't cover — and why
you can almost always add it yourself.

## DX over internal purity

When developer experience and the framework's own internal cleanliness conflict,
**developer experience wins.** This is Nest's own bargain: complex,
reflection-heavy internals in exchange for sterile, declarative application code.
Nestgram does the hard work — discovery, rich event objects, a custom execution
context — so your bot code stays minimal and obvious.

## The pipeline

Every update takes the same path:

:::mental
update source -> queue -> route table -> match -> Nest pipeline\* -> handler -> reply
:::

1. **Update source** — polling or webhook. Pluggable; the rest of the
   pipeline doesn't care where updates come from.
2. **Queue** — per-chat FIFO serialization + bounded concurrency (on by
   default). See [Update delivery & ordering](#update-delivery--ordering).
3. **Context by wrapping** — the raw update is wrapped in a
   `TelegramExecutionContext`, never mutated. The wrapper carries the resolved
   kind, a lazily-built rich event, and a per-update [state store](/docs/extending).
4. **Routing** — a route table built once at boot from your `@Router()` classes;
   per update it's a lookup, not reflection.
5. **Match predicates** — `@Command`/`@Action`/`@Hears`/`@On*` decide which
   handler applies.
6. **The Nest pipeline** — guards → interceptors → pipes → handler → exception
   filters, via Nest's `ExternalContextCreator`.
7. **Result handling** — a returned `string` is replied; a command object is
   executed; `void` does nothing.

## Update delivery & ordering

Between the source and the dispatcher sits an in-process **update queue**, on by
default. It does two things:

- **Per-chat serialization.** A chat's updates run **one at a time, in arrival
  order**. Two quick messages — or rapid taps on an inline keyboard — from the
  same chat can't overlap, so they never race on that chat's
  [session](/docs/sessions) or [FSM](/docs/fsm) state. Different chats still run
  in parallel.
- **Bounded concurrency.** `maxConcurrency` caps how many updates dispatch at
  once across all chats. Once the cap is hit, admitting the next update waits for
  a slot — so the poll loop paces itself instead of fetching unboundedly, and a
  webhook flood can't spawn unbounded concurrent work.

Without it, polling processed updates strictly one at a time (no cross-chat
parallelism) and webhook delivery dispatched every update concurrently (the
race above). The queue fixes both.

It's not privileged machinery: the queue is an `UpdateSource` **decorator** wrapping
the active transport (one per bot), applied through the same public `source`
seam you can plug into — see [Swap the update source](/docs/extending#swap-the-update-source).

Tune or disable it via `forRoot`:

```ts
NestgramModule.forRoot({
  token: process.env.BOT_TOKEN,
  webhook: { url, secretToken },
  updateQueue: {
    maxConcurrency: 200, // parallel dispatches across chats (default: generous)
    // key: (update) => `${update.message?.from?.id}`, // e.g. per-user, not per-chat
  },
  // updateQueue: false, // opt out entirely (no serialization, no bound)
});
```

The default key is the chat. There's one queue per bot, so a multi-bot app never
serializes two bots together even if they share a chat id. Return `undefined`
from a custom `key` to opt an update out of serialization; chat-less updates
(`poll_answer`, inline queries, payment queries) opt out on their own.

:::caution
The queue is **per-process**. Across multiple instances, the same conversation
can still land on different workers and race — move sessions/FSM to a shared
store and put a distributed queue in front (the `UpdateQueue` port is on the
roadmap). It also doesn't add durability: like polling today, an update admitted
but not yet finished is lost on a crash.
:::

## The layers

Nestgram is organised by layer, not by feature — each part has a distinct job:

| Layer        | What lives there                                                                     |
| ------------ | ------------------------------------------------------------------------------------ |
| `engine`     | the update→dispatch machinery: source, discovery, matching, execution, context       |
| `api`        | talking to Telegram: the transport client and the command objects (`SendMessage`, …) |
| `events`     | rich typed events (`Message`, `CallbackQuery`) — data plus the actions on them       |
| `decorators` | the public surface: `@Router`, the listeners, the param decorators                   |

The `engine` itself is the folders of the pipeline above — one per step:

| Folder       | Job                                                                  |
| ------------ | ------------------------------------------------------------------- |
| `source`     | bring updates in (polling / webhook)                                |
| `queue`      | per-chat FIFO + bounded concurrency over the source (see above)     |
| `context`    | wrap each raw update in a `TelegramExecutionContext` (never mutated) |
| `discovery`  | walk the provider graph at boot into the route table                |
| `matching`   | the predicates that decide which handler applies                    |
| `execution`  | build the Nest-pipeline invoker for a matched route                 |
| `dispatcher` | run a context through match → execute → result, isolating failures  |

## Under the hood

A few mechanisms are worth knowing when you reach past the guides.

**The route table is built once, at boot.** On `OnApplicationBootstrap` a route
explorer walks Nest's own `DiscoveryService` and `MetadataScanner` over every
`@Router()` provider and flattens their handlers into one list, in
method-declaration order. Per update there's no reflection — just a lookup,
pre-indexed by update kind. Order _within_ a router is your declaration order
and is contractual; order _across_ routers is discovery order — don't rely on it.

**Update kinds come from a closed whitelist.** `resolveKind` maps a raw update to
exactly one `UpdateKind` from an explicit list; an unknown or future field is
ignored, never guessed. The rich event for a kind comes from a registry keyed by
that kind — adding one is decorating a class with `@UpdateType`, not editing a
`switch`.

**Why your handler's first argument is bare and typed.** Handlers run through
Nest's `ExternalContextCreator`, whose parameter resolution is all-or-nothing:
with a `ParamsFactory` in play, an _undecorated_ parameter comes back
`undefined`. So every handler parameter is decorator-backed — and the framework
auto-applies `@Event()` to parameter 0 for you. You write `handle(message:
Message)` and the framework makes that the event; it's the one place the
reflection shows through, and the reason param decorators are only ever for the
_other_ arguments.

## Why real Nest primitives

The point of building on Nest's pipeline is that **guards, interceptors, pipes
and exception filters just work** — the same `@UseGuards(AdminGuard)` you'd write
on an HTTP controller works on a router, unchanged. There's no parallel
"middleware" system to learn.

:::guardrail[only in Nestgram]
Nothing the framework does is privileged. Auto-answer is an ordinary
interceptor; the default parse mode is an ordinary send hook; matching is an
ordinary predicate. Every built-in is built on the same public extension points
you get — so you can replace any of them. See [Extending Nestgram](/docs/extending).
:::

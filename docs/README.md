# Nestgram docs — DX spec

> [!NOTE]
> This folder is the **docs-first specification** for Nestgram v2. The API
> shown here is the _target_ we are building toward — it is the acceptance
> criteria for the engine, written before the engine. If code and these docs
> disagree, the docs win until we consciously change them here.

These pages are the developer's story, in order. Read them top to bottom and
you've seen the whole framework.

## Mental model

```
Telegram update  ─▶  @Router()  ─▶  guard ─▶ pipe ─▶  handler(event)  ─▶  reply
```

A `@Router()` is a controller. An update is a request. The value your
handler returns is the reply. Around the handler runs the real Nest
pipeline — the same guards, interceptors, pipes and exception filters you
already know from HTTP.

## Pages

1. [Quickstart](./quickstart.md) — install and run an echo bot.
2. [Commands, parameters & keyboards](./commands-and-keyboards.md) —
   `@Command`, parameter decorators, inline & reply keyboards.
3. [Callbacks](./callbacks.md) — `@Action`, editing messages, answering
   callback queries.
4. [Guards & the Nest pipeline](./guards-and-pipeline.md) — an admin-only
   guard, and why the standard Nest primitives just work.

## Conventions used in these docs

- Every example imports from `'nestgram'`.
- Routers are classes named `XxxRouter`, decorated with `@Router()`.
- Handlers receive the concrete event positionally: `handle(message: Message)`.
- Parameter decorators (`@Sender()`, `@Args()`, …) are only for
  cross-cutting or derived values — never for the main event.

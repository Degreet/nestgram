# Nestgram — Roadmap

Delivery phases for Nestgram v2. The design these phases build toward is in
[VISION.md](./VISION.md). Phases are ordered; items inside a phase are not.

## Phase 0 — Docs-first (current)

Write the developer-facing **DX spec before the engine** (readme-driven
development). The spec is the developer's story in real code — quickstart
plus a cookbook — and it freezes the shape of the public API. It becomes the
acceptance criteria for the implementation.

- [x] `README.md`, `VISION.md`, `ROADMAP.md`, `CLAUDE.md`
- [ ] DX spec in `docs/` as Markdown: quickstart (echo), `/start` + keyboard,
      callback (`@Action`), an admin-only guard
- [ ] Lock public API names and signatures from the spec

## Phase 1 — MVP (prove the thesis)

A minimal but real framework that proves the core claim: *a Telegram bot is
just another Nest app, with the full Nest pipeline.*

- [ ] Boot-time route table via `DiscoveryService` + `MetadataScanner`
- [ ] Long polling with bounded concurrency and per-update failure isolation
- [ ] Context by wrapping the update (no mutation) + rich typed events
- [ ] Actions on events (`message.answer(...)`) over the command-object layer
- [ ] Match predicates: `@OnMessage()`, `@Command()`, `@Action()`, `@Hears()`
- [ ] Parameter decorators: `@Sender()`, `@Args()`, `@Payload()`,
      `@CallbackData()`
- [ ] Guards, interceptors and exception filters via `ExternalContextCreator`
- [ ] No privileged core: built-in behaviours (e.g. auto-answer) implemented
      as the same public guards/interceptors a user can write
- [ ] Configurable defaults, all toggleable: default `parseMode`, auto-answer
      callback queries
- [ ] `return string` → reply
- [ ] Keyboard builders (inline + reply)
- [ ] Production baseline: token validation, `getMe` health check, graceful
      shutdown, warning on webhook without secret token
- [ ] `strict: true` in the framework's own `tsconfig`
- [ ] Tests + an example echo / `/start` bot

> Types remain hand-written in this phase; the generator is Phase 2, so the
> thesis isn't blocked on tooling.

## Phase 2 — Real-world bots

Everything needed to ship a production bot.

- [ ] Webhook source: a Nest controller + secret-token validation
- [ ] Pipes + `class-validator` DTOs for payloads
- [ ] Sessions (in-memory + Redis stores), `@Session()`
- [ ] Typed callback-data factory (`pack` / `filter` / typed `parse`) — kills
      the magic-string triad of literal + regex + `split`
- [ ] i18n via `AsyncLocalStorage` (`nestjs-cls`): ambient `t()` / locale,
      explicit pass-through across worker/queue boundaries
- [ ] Type + method **code generation** from a community spec
- [ ] Full update-type coverage
- [ ] Send throttler (global 30/s, 1/s per chat, `429 retry_after`)

## Phase 3 — Conversations

- [ ] FSM / scenes / wizard flows

## Phase 4 — Scale & DX

- [ ] Multi-instance support (Redis sessions, distributed throttling)
- [ ] CLI / schematics
- [ ] Testing utilities (dispatch fake updates against routers)
- [ ] i18n
- [ ] Pagination & media helpers

## Phase 5 — Docs site & launch

- [ ] Astro + Starlight site (landing + docs from the Phase 0 Markdown)
- [ ] Auto-generated API reference
- [ ] Migration guides (from nestjs-telegraf / telegraf)
- [ ] Example gallery
- [ ] `v2.0.0` release

# Nestgram — Roadmap

Delivery phases for Nestgram v2. The design these phases build toward is in
[VISION.md](./VISION.md). Phases are ordered; items inside a phase are not.

> This file is the high-level phase narrative; the checkboxes track
> phase-level scope, not individual tickets.

## Phase 0 — Docs-first ✅

Write the developer-facing **DX spec before the engine** (readme-driven
development). The spec is the developer's story in real code — quickstart
plus a cookbook — and it freezes the shape of the public API. It becomes the
acceptance criteria for the implementation.

- [x] `README.md`, `VISION.md`, `ROADMAP.md`
- [x] DX spec in `docs/` as Markdown: quickstart (echo), `/start` + keyboard,
      callback (`@Action`), an admin-only guard
- [x] Lock public API names and signatures from the spec

## Phase 1 — MVP (prove the thesis) ✅

A minimal but real framework that proves the core claim: _a Telegram bot is
just another Nest app, with the full Nest pipeline._

- [x] Boot-time route table via `DiscoveryService` + `MetadataScanner`
- [x] Long polling with bounded concurrency and per-update failure isolation
- [x] Context by wrapping the update (no mutation) + rich typed events
- [x] Actions on events (`message.answer(...)`) over the command-object layer
- [x] Match predicates: `@OnMessage()`, `@Command()`, `@Action()`, `@Hears()`
- [x] Parameter decorators: `@Sender()`, `@Args()`, `@Payload()`,
      `@CallbackData()`
- [x] Guards, interceptors and exception filters via `ExternalContextCreator`
- [x] No privileged core: built-in behaviours (e.g. auto-answer) implemented
      as the same public guards/interceptors a user can write
- [x] Configurable defaults, all toggleable: default `parseMode`, auto-answer
      callback queries
- [x] `return string` → reply
- [x] Keyboard builders (inline + reply)
- [x] Production baseline: token validation, `getMe` health check, graceful
      shutdown, warning on webhook without secret token
- [x] `strict: true` in the framework's own `tsconfig`
- [x] Tests + an example echo / `/start` bot

## Phase 2 — Real-world bots (current)

Everything needed to ship a production bot.

- [x] Webhook source: a Nest controller + secret-token validation
- [x] Sessions (in-memory + Redis stores), `@Session()`
- [x] Typed callback-data factory (`pack` / `filter` / typed `parse`) — kills
      the magic-string triad of literal + regex + `split`
- [x] i18n via `AsyncLocalStorage`: ambient `t()` / locale, free helpers (and
      `@Locale()`), explicit pass-through across worker/queue boundaries
- [x] Type + method **code generation** from a community spec — `tools/codegen/`
      over a vendored `PaulSonOfLars/telegram-bot-api-spec` (daily docs scrape);
      `npm run generate`
- [x] Full update-type coverage — Bot API 10.0: 176 methods + 295 `Raw*` types
      generated
- [x] Send throttler (global 30/s, 1/s per chat, `429 retry_after`)
- [x] Typed command arguments — `commandArgs(schema)` + `@Args(schema)` (typed,
      coerced, greedy last field)
- [x] Pipes + `class-validator` DTOs for payloads — param pipes run through ECC
      (incl. `ValidationPipe`, with `validateCustomDecorators: true`)

## Phase 3 — Conversations

- [x] FSM core — `stateGroup()` + `FsmState` predicates (`@OnMessage(Reg.name)`),
      `@Fsm()`/`fsm()` write-through context, `@AnyState()`/`@NoState()` over the
      generic `@Match` primitive, `FsmModule` on the shared KV store. Built as a
      pure builtin (stage + predicate + ambient), no privileged core.
- [ ] Scenes / wizard flows — a higher-level layer on top of the FSM core
      _(in progress — `@Scene`/`@Step`/`@OnEnter`/`@OnLeave` + injected `SceneContext`)_

## Phase 4 — Scale & DX

- [ ] Multi-instance support (Redis sessions, distributed throttling)
- [ ] CLI / schematics
- [ ] Testing utilities (dispatch fake updates against routers)
      _(in progress — `NestgramTestbed` + fake-update builders + captured sends)_
- [ ] Pagination & media helpers
- [ ] Auto-update the vendored Bot API spec (scheduled CI regen → PR on drift)
- [ ] Prisma-style user CLI: regenerate the API layer in `node_modules` against
      a newer spec without waiting for a release

## Phase 5 — Docs site & launch

- [ ] Astro docs site (custom generator — Starlight dropped), landing + the
      Phase 0 Markdown
- [ ] Client-side docs search + `llms.txt` for the docs site _(in progress)_
- [ ] Auto-generated API reference
- [ ] Migration guides (from nestjs-telegraf / telegraf)
- [ ] Example gallery
- [ ] `v2.0.0` release

## Beyond v2.0 — extra ideas (not scheduled)

Deliberately out of the v2.0 line — bigger bets to revisit after launch, not
MVP blockers. Designs are roughed out.

- [x] **Multi-bot** (one app, many bots) — shipped ahead of schedule. A
      `bots: []` registry, per-bot `BotService` (`@InjectBot` / `@Bot`),
      `@ForBot` route scoping, and a dispatch-carries-bot refactor so a reply
      goes back through the bot that received the update. Webhook fleet too:
      per-bot `/webhook/:botName` and a single shared endpoint routed by secret
      token (`MultiBotWebhookController` / `SharedWebhookController` +
      `webhookUrl()`).
- [ ] **MTProto transport (mtcute) spike** — expose the existing DX surface
      over MTProto as an opt-in transport swap (large files, methods the Bot
      API doesn't expose). Feasible because the surface is already an
      abstraction over a pluggable `UpdateSource` + command objects.

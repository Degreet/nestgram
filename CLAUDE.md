# CLAUDE.md

Operational brief for AI agents (and humans pairing with them) working in this
repo. [VISION.md](./VISION.md) is the design source of truth;
[ROADMAP.md](./ROADMAP.md) tracks the delivery phases.

## What this is

Nestgram is a **framework** (not a wrapper) for building Telegram bots on
NestJS, using Nest's own execution pipeline. A `@Router()` is a controller, an
update is a request, a handler's return value is the reply.

Status: `v2` pre-release (`alpha`). The engine (discovery → polling/webhook →
dispatch through `ExternalContextCreator`) and the real-world layer (sessions,
i18n, typed callback-data, typed command args, generated Bot API surface, send
throttler, FSM core) are built and tested. See ROADMAP.md for what's next.

## The one rule that overrides others

**Developer experience > the internal purity of our own framework code.** When
they conflict, DX wins — we accept hard, reflection-heavy internals so the bot
author's code stays minimal and declarative. Nest's own bargain.

## Locked decisions

Don't relitigate without the maintainer explicitly reopening:

- **Engine:** our own discovery engine (`DiscoveryService` + `MetadataScanner`),
  boot-time route table. Not a transport, not a wrapper over telegraf/grammY.
- **Nest pipeline:** handlers run through `ExternalContextCreator` so
  guards/interceptors/pipes/exception filters work. No parallel middleware
  system.
- **`@Router()` = controller, update = request.** (`@Router()`, not `@Update()`
  — avoids collision with the `Update` type.)
- **Handler args:** the main event is the concrete typed object, positional, no
  decorator in user code (`handle(message: Message)`). Param decorators
  (`@Sender()`, `@Args()`, …) are only for cross-cutting/derived values. Rich
  class events, never a god-context.
- **Return values:** `return string` → reply; command objects
  (`new SendMessage(...)`) are the layer underneath; `message.answer(...)` is
  sugar on top.
- **Types:** generated from a vendored community spec
  (`PaulSonOfLars/telegram-bot-api-spec`, a daily re-scrape of the official
  docs; pinned under `tools/codegen/spec/api.min.json`) — types + method
  classes, emitted into `lib/` and committed. `npm run generate` (manual, never
  a prebuild); `npm run spec:update` bumps the spec; `npm run generate --
--check` is the staleness guard. The hand-owned seam in
  `tools/codegen/manifest.ts` carries the judgment calls: bare names, rich
  `wrap()` bodies, multipart media config, file-field widening
  (`string | InputFile`), the enum table. A new rich-event method needs a
  manifest entry.
- **No privileged core:** built-ins (auto-answer, default parse mode) are
  public, toggleable interceptors a user could have written.
- **Docs:** docs-first, authored as Markdown in repo-root `docs/`, rendered by
  a custom Astro generator (`website/`).

## Hard-won invariants

Learned empirically — breaking these breaks the framework:

- **ECC param resolution is all-or-nothing.** With a `ParamsFactory` supplied,
  undecorated params come back `undefined`; without one, decorated params never
  resolve. So every handler param is decorator-backed and the framework
  auto-applies `@Event()` to param 0 — the author still writes a bare typed
  first arg. Don't mix paths.
- **Never mutate the raw update.** The context wraps it; rich events are built
  as copies via the `@UpdateType` registry.
- **First-match wins.** One update runs only the first matching route, in
  method-declaration order within a router; cross-router order is undefined.
- **`resolveKind` uses an explicit whitelist** of update kinds — unknown/future
  fields are ignored, never guessed.
- **Nest has no multi-providers:** `multi: true` collapses to last-wins.
  Cross-cutting registries here use explicit arrays or discovery instead.
- **Docs directives:** a closing `:::` must not directly follow a blockquote
  line or list item (CommonMark lazy continuation swallows it — Prettier makes
  the breakage visible). Blank line before every closing `:::`.

## Project layout

Source in **`lib/`** (not `src/`); build output `dist/`. kebab-case files;
types live beside their feature (no global `types/`).

- **`lib/engine/`** — the update→dispatch pipeline: `source` → `discovery` →
  `matching` → `dispatcher` → `execution` → `context`.
- **`lib/api/`** — Telegram transport (`bot.service.ts`, `methods/`,
  `request/`).
- **`lib/events/`** — rich typed events (`Message`, `CallbackQuery`, …).
- Public surface: `lib/decorators`, `lib/module` (`NestgramModule`). Feature
  helpers: `keyboards/`, `formatting/`, `callback-data/`, `command-args/`,
  `deep-links/`, `sessions/`, `i18n/`, `fsm/`, `store/`, `encoding/`.

## Commands

- Build: `npm run build` (`nest build`) · Dev: `npm run start:dev`
- Test: `npx jest` (tests are `lib/**/*.spec.ts`) · Lint: `npm run lint`
- Codegen: `npm run generate` (re-emit API types + methods from the vendored
  spec) · `npm run spec:update` (bump the spec). Generated `lib/` files are
  committed; don't hand-edit them — change the emitter/manifest and regenerate.
- Docs site: `cd website && npm run build` (renders repo-root `docs/*.md`).

## Conventions

- Single quotes, semicolons (Prettier + ESLint). Conventional Commits.
- Compiles under `strict: true` — keep it (model the types, no `any`-casts to
  silence the checker).
- **No magic strings/numbers.** Extract meaningful literals to a named constant
  or `enum` (update kinds → `UpdateKind`). A literal compared in code
  (`kind === 'callback_query'`) is the smell.
- **Classes over free functions.** A standalone function is justified only for
  a pure, stateless, dependency-free transform that stands on its own as a
  shared utility (its own module). A helper used by one class is **never** a
  module-level function sitting beside it — even a pure one: make it a `private`
  method (`private static` when it touches no instance state). Anything with
  collaborators — especially DI-managed — is an `@Injectable()` provider. Types
  live beside their feature (`*.types.ts`).
- Verify before claiming done: build + lint + full jest, and compile every doc
  code sample you touch.

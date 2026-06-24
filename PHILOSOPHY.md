# Philosophy

The handful of decisions that shape Nestgram. If a piece of the API ever
surprises you, the reason is almost always one of these.

- **Developer experience beats our own purity.** Nestgram is reflection-heavy
  and does real work at boot so your handler stays three honest lines. When DX
  and the internal elegance of our own code conflict, DX wins — deliberately.

- **A framework, not a wrapper.** A `@Router()` is a controller, an update is a
  request, a handler's return value is the reply. You reuse Nest's whole
  pipeline — guards, interceptors, pipes, exception filters — because handlers
  run through its `ExternalContextCreator`. Nestgram runs its own discovery
  engine on Nest, not a telegraf/grammY runtime underneath.

- **Rich typed events, not a god-context.** The first handler argument is the
  concrete event the route matched — `handle(message: Message)` — with the
  actions on it (`message.answer(...)`). Param decorators are for
  cross-cutting or derived values only, never the main event.

- **No privileged core.** The built-in behaviours — auto-answering callbacks,
  default parse mode, throttling — are public, toggleable interceptors you
  could have written. Disable or replace any of them without forking.

- **Reveal the magic, name the boundaries.** Where behaviour comes from
  somewhere non-obvious, we name the mover. Where a limit exists — the ambient
  store behind `t()`/`locale()` is `AsyncLocalStorage`, in-process — we say it
  out loud. Honest boundaries beat leaky magic.

- **A current API, generated.** The whole Bot API layer is generated from a
  daily re-scrape of the official docs, then committed. A new Telegram release
  is a regeneration, not a weekend of hand-typing.

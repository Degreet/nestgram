# Vendored Telegram Bot API spec

`api.min.json` is a pinned copy of the machine-readable Telegram Bot API spec
from [**PaulSonOfLars/telegram-bot-api-spec**](https://github.com/PaulSonOfLars/telegram-bot-api-spec),
which re-scrapes `core.telegram.org/bots/api` daily. (We previously used
`ark0f/tg-bot-api`, which went stale at Bot API 8.3 with its last commit in
November 2024.)

- **Source:** https://raw.githubusercontent.com/PaulSonOfLars/telegram-bot-api-spec/main/api.min.json
- **License:** see the upstream repository
- **Why vendored:** the published file is mutable (it redeploys on every upstream
  scrape), so fetching at generate time would make two builds minutes apart emit
  different code. Pinning the file gives reproducible, reviewable builds.
- **Why not parse the docs ourselves:** Telegram publishes no official
  machine-readable spec, and its docs are hand-written HTML with no stable
  markup contract. Delegating the scrape to a daily-maintained community project
  is more robust than owning a brittle HTML parser.

## Updating

Run `npm run spec:update` to re-download the spec. It rewrites this directory:

- `api.min.json` — the spec itself (kept byte-identical to upstream; it is listed
  in `.prettierignore` so formatting never drifts from its recorded hash).
- `spec-version.json` — Bot API version + upstream release date + counts.
- `hash.txt` — SHA-1 of the spec, so a bump is an auditable diff.

Review the resulting diff (it shows exactly which Bot API fields changed), then
run `npm run generate` to re-emit the types and method classes. The hand-owned
seam in `tools/codegen/manifest.ts` (bare names, rich `wrap()` bodies, multipart
media config, file-field widening, enum/discriminator recovery) may need a new
entry for a new method or type.

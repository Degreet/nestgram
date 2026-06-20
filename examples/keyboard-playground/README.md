# keyboard-playground

A bot to play with Nestgram's state-driven keyboards live. Every selection is a
pure projection of small **per-message keyboard state** the framework owns — you
write builders and Done handlers, never a toggle or nav handler.

| Command   | Shows                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| `/start`  | A welcome with the command list.                                             |
| `/topics` | A **multi-select** checkbox group (`✅`/`☐`) + Done.                          |
| `/color`  | A **single-select** radio group (`🔘`/`⚪`) + Done.                           |
| `/pick`   | The **flagship**: a category radio drives a scoped, paginated tag picker.    |

## What `/pick` demonstrates

One declarative `@KeyboardRender('category', 'tags')` builder, no hand-written
routing:

- **Linked** — the chosen category (`selectedIds('category')`) decides which tags
  render.
- **Scoped** — `scope: () => selectedIds('category')[0]` keeps a separate tag set
  per category (`checkbox:tags:<category>`); switching never mixes picks, and
  switching back restores them.
- **Paginated** — `.paginate(id, { size })` inside a build scrolls only the rows
  above it, so the Select all / Reset / Done row below it stays pinned on every
  page; a checkbox tap keeps the page it's on (the cursor lives in the callback-data).
- **Actions** — `cb.clear('Reset')` is a built-in; `Select all` is a plain
  `@Action` that mutates via `setSelectedIds` and returns `this.menu()`.

## Run

This folder imports from `nestgram` exactly as an outside app would — here it
resolves to `lib/` via the repo's `tsconfig` path alias. Run it from the **repo
root**:

```bash
BOT_TOKEN=123456789:your-token npx ts-node -r tsconfig-paths/register \
  examples/keyboard-playground/main.ts
```

Get a token from [@BotFather](https://t.me/BotFather). Polling needs no HTTP
server — the bot runs as a plain Nest application context, so `Ctrl-C` stops it
cleanly.

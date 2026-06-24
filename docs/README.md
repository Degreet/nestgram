# Nestgram docs

This folder is the **source the website renders**: every `*.md` here becomes a
page under `/docs/<filename>` on the Astro site (`website/`). Sidebar grouping
and order come from each file's own frontmatter (`sidebar: { label, group,
order }`) — there is no central sidebar file, and no hand-maintained page list
here (it only rots). Add a `.md`, give it frontmatter, and the page appears.
The engine is built; if a page and the code disagree, fix the page.

## Authoring notes

- Custom blocks use `remark-directive` syntax (`:::tip`, `:::code[file.ts]`,
  `:::mental`, `:::anno`, `:::tabs`, …) — the full vocabulary lives in
  `website/gen/remark-nestgram-blocks.mjs` (the plugin is the single source of
  truth). Keep a blank line before a closing `:::` that follows a list or
  blockquote, or lazy continuation swallows it.
- Every example imports from `'nestgram'`; routers are classes named
  `XxxRouter`, decorated with `@Router()`.
- Handlers receive the concrete event positionally (`handle(message:
  Message)`); parameter decorators are only for cross-cutting or derived
  values — never for the main event.
- Code samples must type-check against the framework's strict `tsconfig`
  (paths `nestgram` → `lib`).

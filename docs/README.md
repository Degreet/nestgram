# Nestgram docs

This folder is the **source the website renders**: every `*.md` here becomes
a page under `/docs/<filename>` on the Astro site (`website/`). Sidebar
grouping and order come from each file's own frontmatter
(`sidebar: { label, group, order }`) — there is no central sidebar file. The
engine is built; if a page and the code disagree, fix the page.

## Pages, as grouped in the sidebar

**Introduction**

- [What is Nestgram](./what-is-nestgram.md)
- [Mental model](./mental-model.md)
- [Installation](./installation.md)

**Getting started**

- [Quickstart](./quickstart.md)

**Routing**

- [Routers](./routers.md)
- [Match predicates](./match-predicates.md)
- [Update types](./update-types.md)
- [Custom predicates](./custom-predicates.md)

**Events & replies**

- [Callbacks](./callbacks.md)

**Keyboards**

- [Commands, parameters & keyboards](./commands-and-keyboards.md)

**The Nest pipeline**

- [Guards & the Nest pipeline](./guards-and-pipeline.md)

**State & sessions**

- [Sessions](./sessions.md)
- [Conversations: the FSM](./fsm.md)
- [i18n](./i18n.md)

**Concepts**

- [How Nestgram works](./how-nestgram-works.md)
- [Extending Nestgram](./extending.md)

## Authoring notes

- Custom blocks use `remark-directive` syntax (`:::tip`, `:::code[file.ts]`,
  `:::mental`, `:::anno`, `:::tabs`, …) — the full vocabulary lives in
  [notes/docs-generator-plan.md](../notes/docs-generator-plan.md). Keep a
  blank line before a closing `:::` that follows a list or blockquote, or
  lazy continuation swallows it.
- Every example imports from `'nestgram'`; routers are classes named
  `XxxRouter`, decorated with `@Router()`.
- Handlers receive the concrete event positionally
  (`handle(message: Message)`); parameter decorators are only for
  cross-cutting or derived values — never for the main event.
- Code samples must type-check against the framework's strict `tsconfig`
  (paths `nestgram` → `lib`).

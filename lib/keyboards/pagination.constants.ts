/**
 * Routes a paginated section's nav buttons own. The section id and target page are
 * captured params, so the framework — not the bot author — owns the callback-data
 * contract (mirroring `checkbox/<id>/…`). Two routes so the *current* page of a
 * section can be read back unambiguously from a rendered keyboard:
 *
 * - `pagego/<section>/<page>` — the tappable prev/next controls (go to `page`).
 * - `pageat/<section>/<page>` — the inert counter, carrying the section's CURRENT
 *   page. The pagination router reads these from the incoming markup to recover
 *   the page of every *other* section when one is navigated, so the cursor lives
 *   in the keyboard itself (self-describing, restart/TTL-proof) and not a store.
 */
export const PAGINATE_GO_ROUTE = 'pagego/:section/:page';
export const PAGINATE_AT_ROUTE = 'pageat/:section/:page';

/** The `:param` names in the pagination routes, so build and read can't desync. */
export const PAGINATE_PARAMS = { section: 'section', page: 'page' } as const;

/** Default prev/next control labels, overridable per `paginate()` call. */
export const PAGINATION_DEFAULT_LABELS = { prev: '‹', next: '›' } as const;

/**
 * Ambient-store key for the current page of each paginated section this render,
 * `{ [sectionId]: page }`. The pagination router populates it (from the tapped
 * callback + the pages read off the incoming markup) before re-invoking the
 * builder; `InlineKeyboard.paginate(id)` reads its page from it (default 0).
 */
export const PAGINATION_CURSORS = Symbol('nestgram:pagination-cursors');

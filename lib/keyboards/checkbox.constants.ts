/**
 * The callback-route a checkbox toggle button owns. Shared by the checkbox scope
 * (which builds it into each button) and the built-in checkbox router (which
 * matches it) — the one place the `checkbox/<id>/toggle/<item>` contract lives.
 */
export const CHECKBOX_TOGGLE_ROUTE = 'checkbox/:cb/toggle/:item';

/** The route a `cb.done()` button owns — matched by `@OnCheckboxDone(id)`. */
export const CHECKBOX_DONE_ROUTE = 'checkbox/:cb/done';

/** The `:param` names in the checkbox routes, so build and route can't desync. */
export const CHECKBOX_PARAMS = { cb: 'cb', item: 'item' } as const;

/** Prefix under which the zero-config default persists a selection in the session. */
export const CHECKBOX_SESSION_PREFIX = 'checkbox:';

/**
 * Default checkbox glyphs: a ✅ on the selected item and nothing on the rest —
 * the colour emoji reads cleanly in Telegram (unlike the monochrome ☑/☐ text
 * symbols). Shared by `Button.toggle()` and the InlineKeyboard checkbox builder.
 */
export const CHECKBOX_DEFAULT_MARKERS = { on: '✅', off: '' } as const;

/** Default single-select (radio) glyphs. */
export const CHECKBOX_RADIO_MARKERS = { on: '🔘', off: '⚪' } as const;

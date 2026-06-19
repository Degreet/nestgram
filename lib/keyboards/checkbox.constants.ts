/**
 * Default checkbox glyphs: a ✅ on the selected item and nothing on the rest —
 * the colour emoji reads cleanly in Telegram (unlike the monochrome ☑/☐ text
 * symbols). Shared by `Button.toggle()` and the InlineKeyboard checkbox builder.
 */
export const CHECKBOX_DEFAULT_MARKERS = { on: '✅', off: '' } as const;

/** Default single-select (radio) glyphs. */
export const CHECKBOX_RADIO_MARKERS = { on: '🔘', off: '⚪' } as const;

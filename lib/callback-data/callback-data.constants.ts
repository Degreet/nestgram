/** Field separator in encoded callback data; escaped when it occurs in a value. */
export const SEGMENT_SEPARATOR = ':';

/** Escape character for the separator (and itself) inside an encoded value. */
export const ESCAPE_CHARACTER = '\\';

/** Telegram's hard limit: `callback_data` is 1–64 bytes (UTF-8). */
export const MAX_CALLBACK_DATA_BYTES = 64;

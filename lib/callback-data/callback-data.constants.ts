/** Field separator in encoded callback data; escaped when it occurs in a value. */
export const SEGMENT_SEPARATOR = ':';

/** Escape character for the separator (and itself) inside an encoded value. */
export const ESCAPE_CHARACTER = '\\';

/** Telegram's hard limit: `callback_data` is 1–64 bytes (UTF-8). */
export const MAX_CALLBACK_DATA_BYTES = 64;

/**
 * Segment separator in a callback *route* (`reminder/done/:id`). Distinct from
 * {@link SEGMENT_SEPARATOR}: routes read like URL paths, so `/` divides segments
 * and `:` (see {@link ROUTE_PARAM_PREFIX}) marks a parameter. Escaped when it
 * occurs inside a parameter value.
 */
export const ROUTE_SEGMENT_SEPARATOR = '/';

/** Marks a route segment as a parameter: a whole segment starting with `:` (`:id`). */
export const ROUTE_PARAM_PREFIX = ':';

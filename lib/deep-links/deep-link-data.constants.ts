/**
 * Separator between the prefix and fields of encoded deep-link data. It is in
 * the deep-link charset and is never produced by the Number/Boolean codecs, so
 * no escaping is needed (unlike callback data, where `\` escapes the separator —
 * `\` is invalid in a deep link).
 */
export const DATA_SEGMENT_SEPARATOR = '_';

/**
 * Allowed prefix charset: the deep-link charset minus the `_` separator, so the
 * prefix can never be mistaken for a field boundary.
 */
export const VALID_DATA_PREFIX = /^[A-Za-z0-9-]+$/;

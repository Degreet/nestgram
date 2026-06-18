/**
 * Command routes split on whitespace — the first token is the command name
 * (`add` in `add :amount :note...`) and every token after it is an argument
 * segment. Unlike a callback route (`reminder/done/:id`, split on `/`), the wire
 * here is the message the user types, so the separator is the space between
 * words.
 */
export const COMMAND_SEGMENT_SEPARATOR = /\s+/;

/** Joins captured tokens back into a single value (the greedy `:rest...` segment). */
export const COMMAND_TOKEN_JOINER = ' ';

/** Marks an argument segment as a parameter: a token starting with `:` (`:amount`). */
export const COMMAND_PARAM_PREFIX = ':';

/**
 * Marks a parameter as greedy: a trailing `...` (`:note...`) captures the rest of
 * the message as one value. Only the last segment may be greedy.
 */
export const COMMAND_REST_SUFFIX = '...';

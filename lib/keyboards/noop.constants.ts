/**
 * The reserved `callback_data` of a no-op (dead-end) button — `Button.noop()` and
 * `.else('label')`. A built-in handler matches it and just answers the query, so
 * the press stops the button's spinner without doing anything and the dead-button
 * warning never fires (the route is handled, on purpose).
 */
export const NOOP_CALLBACK_DATA = '__nestgram_noop__';

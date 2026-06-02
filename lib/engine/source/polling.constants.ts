/**
 * How long to wait after a failed `getUpdates` before retrying.
 *
 * Keeps a transient network error from spinning the poll loop hot: the source
 * backs off for this long and keeps running instead of crashing on a blip.
 */
export const DEFAULT_POLLING_BACKOFF_MS = 1000;

/**
 * How long to idle after an empty batch before fetching again.
 *
 * With normal long polling `getUpdates` blocks server-side for `timeout`
 * seconds, so empty batches are rare. But if the server returns immediately
 * (e.g. `timeout` unset/zero) this idle keeps the loop from busy-spinning and,
 * crucially, yields the macrotask queue each turn so timers and I/O are never
 * starved by a microtask-only hot loop.
 */
export const DEFAULT_POLLING_IDLE_MS = 300;

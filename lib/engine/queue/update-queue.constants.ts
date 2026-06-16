/**
 * Default cap on updates dispatched in parallel across all chats. Generous on
 * purpose — it is a runaway guard, not a throughput throttle: Telegram already
 * bounds inbound concurrency far below this (a polling batch is ≤ 100, a
 * webhook's `max_connections` defaults to 40), so the default rarely engages and
 * mainly protects against a misconfigured high `max_connections` or a burst of
 * chat-less updates. Tune via `updateQueue.maxConcurrency`.
 */
export const DEFAULT_MAX_CONCURRENCY = 1000;

/**
 * Default ceiling on how long {@link UpdateQueue.drain} waits for in-flight
 * updates on shutdown before abandoning the stragglers (and logging them). Keeps
 * a wedged handler from hanging `app.close()` forever, while giving normal
 * handlers ample time to finish. Tune via `updateQueue.drainTimeoutMs`.
 */
export const DEFAULT_DRAIN_TIMEOUT_MS = 10_000;

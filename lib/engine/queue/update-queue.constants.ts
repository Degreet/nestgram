/**
 * Default cap on updates dispatched in parallel across all chats. Generous on
 * purpose — it is a runaway guard, not a throughput throttle: Telegram already
 * bounds inbound concurrency far below this (a polling batch is ≤ 100, a
 * webhook's `max_connections` defaults to 40), so the default rarely engages and
 * mainly protects against a misconfigured high `max_connections` or a burst of
 * chat-less updates. Tune via `updateQueue.maxConcurrency`.
 */
export const DEFAULT_MAX_CONCURRENCY = 1000;

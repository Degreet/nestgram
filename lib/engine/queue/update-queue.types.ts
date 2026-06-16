import { RawUpdate } from '../../events/raw-update.types';

/**
 * Tuning for the in-process {@link UpdateQueue}. Pass under
 * `NestgramModule.forRoot({ updateQueue: { ... } })`, or `false` there to turn
 * the queue off entirely (dispatch every update immediately, unserialized and
 * unbounded — the pre-queue behaviour).
 */
export interface UpdateQueueOptions {
  /**
   * Max updates dispatched in parallel across all chats. Once reached, new
   * updates wait for a slot — the poll loop stops fetching, a webhook caller is
   * held — so this doubles as the backpressure threshold. Per-chat order is
   * always preserved regardless of this value. Defaults to a generous runaway
   * guard (see `DEFAULT_MAX_CONCURRENCY`).
   */
  maxConcurrency?: number;
  /**
   * Serialization key for an update: updates sharing a key dispatch one at a time
   * in arrival order (FIFO), different keys run in parallel. Defaults to keying
   * by chat. Return `undefined` to opt an update out of serialization (it then
   * runs concurrency-bounded only). There is one queue per bot, so a key only
   * needs to be unique within a single bot — two bots that share a chat id never
   * serialize together regardless.
   */
  key?: (update: RawUpdate) => string | undefined;
}

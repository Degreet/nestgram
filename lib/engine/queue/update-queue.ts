import { Logger } from '@nestjs/common';

import { RawUpdate } from '../../events/raw-update.types';
import { NestgramConfigError } from '../../exceptions';
import { defaultChatKey } from './chat-key';
import { Semaphore } from './semaphore';
import { DEFAULT_MAX_CONCURRENCY } from './update-queue.constants';
import { UpdateQueueOptions } from './update-queue.types';

/** The dispatch to run for one update. The queue only schedules it; it does not
 *  know what dispatch does (it's the source's `onUpdate`, bound to the update). */
export type QueuedDispatch = () => Promise<void>;

/**
 * In-process update queue (rung 1 of the queue ladder — no Redis): per-chat FIFO
 * serialization plus a bounded-concurrency cap. The mechanism behind
 * {@link QueuedUpdateSource}; constructed once per bot (so the cap is per-bot and
 * a chat's key never needs bot-name scoping — a queue only ever sees one bot's
 * updates).
 *
 * Two problems it fixes for a single-instance bot:
 *
 *   - **Correctness.** Two updates from the same chat (a user firing off two
 *     quick messages) used to dispatch truly in parallel under webhook delivery,
 *     racing on that chat's session/FSM state. Here they serialize: a chat's
 *     updates run one at a time in arrival order. Different chats still run in
 *     parallel.
 *   - **Backpressure.** `maxConcurrency` caps how many updates dispatch at once;
 *     once the cap is hit, admitting the next update waits for a slot. The poll
 *     loop awaits admission, so it paces itself to the bound instead of fetching
 *     unboundedly; a webhook controller awaiting delivery is likewise held.
 *
 * `enqueue` resolves at ADMISSION — the update's turn in its chat's chain has
 * come and a slot is free, i.e. dispatch is about to start — NOT when the handler
 * finishes. Dispatch then runs in the background and frees its slot on
 * completion. Resolving at admission is what lets the poll loop both parallelize
 * across chats and apply backpressure without ever waiting on a single slow
 * handler.
 */
export class UpdateQueue {
  private readonly logger = new Logger(UpdateQueue.name);
  private readonly semaphore: Semaphore;
  private readonly maxConcurrency: number;
  private readonly keyOf: (update: RawUpdate) => string | undefined;

  /**
   * Per-key tail: the promise of the last enqueued dispatch for a key. The next
   * update with that key chains after it (FIFO). An entry is removed once its
   * chain drains, so the map only holds keys with work in flight.
   */
  private readonly tails = new Map<string, Promise<void>>();

  /** Every dispatch currently in flight (queued or running), so {@link drain} can
   *  await them on shutdown. Chat-less updates aren't in `tails`, so this is the
   *  authoritative set. */
  private readonly running = new Set<Promise<void>>();

  private static readonly RESOLVED: Promise<void> = Promise.resolve();

  constructor(options?: UpdateQueueOptions) {
    const maxConcurrency = options?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY;
    // A positive integer: rules out 0/negative, fractions, and Infinity — the
    // queue is meant to be bounded, and a finite cap keeps `active` accounting
    // exact. (The Semaphore guards the floor too; this gives a friendlier error.)
    if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
      throw new NestgramConfigError(
        `updateQueue.maxConcurrency must be a positive integer, got ${maxConcurrency}`,
      );
    }
    this.maxConcurrency = maxConcurrency;
    this.semaphore = new Semaphore(maxConcurrency);
    this.keyOf = options?.key ?? defaultChatKey;
  }

  /**
   * Admit one update for dispatch. Resolves once it is admitted (its chat's chain
   * has reached it and a concurrency slot is free); the supplied `dispatch` then
   * runs in the background.
   */
  enqueue(update: RawUpdate, dispatch: QueuedDispatch): Promise<void> {
    const key = this.keyOf(update);
    const predecessor =
      key !== undefined
        ? this.tails.get(key) ?? UpdateQueue.RESOLVED
        : UpdateQueue.RESOLVED;

    let signalAdmitted!: () => void;
    const admitted = new Promise<void>((resolve) => {
      signalAdmitted = resolve;
    });

    // `process` never rejects (see below), so a chat-less `finished` that is
    // neither tracked nor awaited can't become an unhandled rejection.
    const finished = this.process(predecessor, dispatch, signalAdmitted);
    this.running.add(finished);
    void finished.finally(() => this.running.delete(finished));
    if (key !== undefined) {
      this.track(key, finished);
    }
    return admitted;
  }

  /** Wait for every in-flight dispatch to finish — for graceful shutdown, after
   *  the source has stopped admitting new updates. */
  async drain(): Promise<void> {
    await Promise.allSettled([...this.running]);
  }

  /** Updates dispatching right now (holding a slot). For tests/observability. */
  get active(): number {
    return this.maxConcurrency - this.semaphore.free;
  }

  /** Updates admitted but waiting for a slot (backpressured). For tests/observability. */
  get waiting(): number {
    return this.semaphore.waiting;
  }

  /**
   * Wait for the predecessor (per-chat FIFO), take a concurrency slot
   * (backpressure), signal admission, then run dispatch and free the slot. A
   * predecessor's outcome is irrelevant to ordering, so its rejection is ignored
   * — it never breaks the chain. Dispatch is expected to isolate its own errors;
   * the guard here is a backstop so a throw can never leak a permit or wedge the
   * chain.
   *
   * Resolves and NEVER rejects: every `await` inside is either caught or
   * (the semaphore) cannot reject. `enqueue` relies on this — it floats the
   * returned promise for chat-less updates and chains it as a predecessor.
   */
  private async process(
    predecessor: Promise<void>,
    dispatch: QueuedDispatch,
    signalAdmitted: () => void,
  ): Promise<void> {
    await predecessor.catch(() => undefined);
    const release = await this.semaphore.acquire();
    signalAdmitted();
    try {
      await dispatch();
    } catch (error) {
      this.logger.error(
        'Update dispatch threw despite per-update isolation',
        error as Error,
      );
    } finally {
      release();
    }
  }

  /** Make `finished` the key's tail, and drop the entry once it drains (if no
   *  later update has since replaced it as the tail). */
  private track(key: string, finished: Promise<void>): void {
    this.tails.set(key, finished);
    void finished.finally(() => {
      if (this.tails.get(key) === finished) {
        this.tails.delete(key);
      }
    });
  }
}

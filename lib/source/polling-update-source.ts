import { Logger } from '@nestjs/common';

import { BotService } from '../bot';
import { GetUpdates } from '../methods';
import { RawUpdate } from '../types/raw-update.types';
import {
  DEFAULT_POLLING_BACKOFF_MS,
  DEFAULT_POLLING_IDLE_MS,
} from './polling.constants';
import { UpdateListener, UpdateSource } from './update-source';

export interface PollingOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
  /** Clear updates accumulated while the bot was offline before polling. */
  dropPendingUpdates?: boolean;
  /** Delay before retrying after a failed fetch (ms). */
  backoffMs?: number;
  /** Idle between fetches when a batch comes back empty (ms). */
  idleMs?: number;
}

/**
 * Fetches one batch of updates from `offset`, honouring the abort signal so a
 * long poll can be cancelled promptly on stop. Extracted as a seam so the loop
 * can be driven in tests without hitting the network.
 */
export type BatchFetcher = (
  offset: number,
  signal: AbortSignal,
) => Promise<RawUpdate[]>;

/**
 * Long-polling update source.
 *
 * Owns only the poll loop and the `getUpdates` offset; it does not route or
 * execute. On start it prepares the transport (clears any webhook so polling is
 * allowed, then a `getMe` health check that fails fast on a bad token), then
 * loops: fetch a batch, advance the offset to acknowledge receipt, emit each
 * update. A failed fetch backs off instead of killing the loop.
 */
export class PollingUpdateSource implements UpdateSource {
  private readonly logger = new Logger(PollingUpdateSource.name);
  private readonly fetcher: BatchFetcher;
  private readonly backoffMs: number;
  private readonly idleMs: number;

  private offset: number;
  private controller?: AbortController;
  private loopPromise?: Promise<void>;
  private running = false;

  constructor(
    private readonly botService: BotService,
    private readonly options: PollingOptions = {},
    fetcher?: BatchFetcher,
  ) {
    this.offset = options.offset ?? 0;
    this.backoffMs = options.backoffMs ?? DEFAULT_POLLING_BACKOFF_MS;
    this.idleMs = options.idleMs ?? DEFAULT_POLLING_IDLE_MS;
    this.fetcher = fetcher ?? this.fetchBatch.bind(this);
  }

  async start(onUpdate: UpdateListener): Promise<void> {
    if (this.running) {
      this.logger.warn('Polling already running; ignoring start()');
      return;
    }

    await this.prepare();

    this.controller = new AbortController();
    this.running = true;
    this.logger.log('Polling started');
    this.loopPromise = this.loop(onUpdate, this.controller.signal);
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.controller?.abort();
    await this.loopPromise;
    this.logger.log('Polling stopped');
  }

  private async prepare(): Promise<void> {
    await this.botService.deleteWebhook({
      drop_pending_updates: this.options.dropPendingUpdates,
    });
    const me = await this.botService.getMe();
    this.logger.debug(`Bot @${me.username} ready to poll`);
  }

  private async loop(
    onUpdate: UpdateListener,
    signal: AbortSignal,
  ): Promise<void> {
    while (!signal.aborted) {
      let batch: RawUpdate[];
      try {
        batch = await this.fetcher(this.offset, signal);
      } catch (error) {
        if (signal.aborted || (error as Error)?.name === 'AbortError') {
          break;
        }
        this.logger.error('getUpdates failed; backing off', error as Error);
        await this.delay(this.backoffMs, signal);
        continue;
      }

      if (batch.length === 0) {
        // Idle (via a timer) instead of looping immediately: this both avoids a
        // busy-spin and yields the macrotask queue, so a microtask-only hot loop
        // can never starve timers/I-O.
        await this.delay(this.idleMs, signal);
        continue;
      }

      // Advance past the whole batch first: the offset acknowledges *receipt*,
      // independent of how each update is later processed.
      this.offset = batch[batch.length - 1].update_id + 1;

      for (const update of batch) {
        if (signal.aborted) {
          break;
        }
        await onUpdate(update);
      }
    }
  }

  /** Resolves after `ms`, or as soon as the signal aborts. */
  private delay(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      const onAbort = () => done();
      signal.addEventListener('abort', onAbort, { once: true });
      function done() {
        clearTimeout(timer);
        signal.removeEventListener('abort', onAbort);
        resolve();
      }
    });
  }

  private fetchBatch(
    offset: number,
    signal: AbortSignal,
  ): Promise<RawUpdate[]> {
    const getUpdates = new GetUpdates(this.botService, {
      offset,
      limit: this.options.limit,
      timeout: this.options.timeout,
      allowed_updates: this.options.allowed_updates,
    });
    // The legacy GetUpdates is typed `Update[]`, but the wire result is the raw
    // shape (no `_updateType`/`_telegramObject` — those are legacy mutations).
    // This is the single boundary cast between legacy transport and raw types.
    return getUpdates.fetch(signal) as unknown as Promise<RawUpdate[]>;
  }
}

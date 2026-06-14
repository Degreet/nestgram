import { Injectable, Logger } from '@nestjs/common';

import { BotService } from '../../api';
import { RawUpdate } from '../../events/raw-update.types';
import type { AllowedUpdate } from '../context/update-kind';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import {
  DEFAULT_POLLING_BACKOFF_MS,
  DEFAULT_POLLING_IDLE_MS,
} from './polling.constants';
import { UpdateListener, UpdateSource } from './update-source';

export interface PollingOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  /**
   * Explicit `allowed_updates` for `getUpdates`. Omit (recommended) to derive
   * the list from your handlers — that also requests the kinds Telegram holds
   * back by default (`chat_member`, `message_reaction`, …) whenever a handler
   * listens to them. With an explicit list, a handler for a kind the list
   * omits is dead — the bot warns about it at startup.
   */
  allowed_updates?: AllowedUpdate[];
  /** Clear updates accumulated while the bot was offline before polling. */
  dropPendingUpdates?: boolean;
  /** Delay before retrying after a failed fetch (ms). */
  backoffMs?: number;
  /** Idle between fetches when a batch comes back empty (ms). */
  idleMs?: number;
}

/**
 * Long-polling update source.
 *
 * Owns the poll loop and the `getUpdates` offset; it does not route or execute.
 * On start it prepares the transport (clears any webhook so polling is allowed)
 * and loops: fetch a batch, advance the offset to acknowledge receipt, emit each
 * update. A failed fetch backs off instead of killing the loop. The bot identity
 * / health check (`getMe`) is warmed transport-agnostically in `NestgramBootstrap`.
 *
 * Bound to ONE bot: it takes that bot's `BotService` and polling options at
 * construction, so a multi-bot app builds one poller per bot. The single-bot
 * path constructs it from the top-level config via a factory provider.
 */
@Injectable()
export class PollingUpdateSource implements UpdateSource {
  private readonly logger = new Logger(PollingUpdateSource.name);
  private readonly options: PollingOptions;
  private readonly backoffMs: number;
  private readonly idleMs: number;

  private offset: number;
  private allowedUpdates?: string[];
  private controller?: AbortController;
  private loopPromise?: Promise<void>;
  private running = false;

  constructor(
    private readonly botService: BotService,
    options: PollingOptions | undefined,
    private readonly allowedUpdatesResolver: AllowedUpdatesResolver,
  ) {
    this.options = options ?? {};
    this.offset = this.options.offset ?? 0;
    this.backoffMs = this.options.backoffMs ?? DEFAULT_POLLING_BACKOFF_MS;
    this.idleMs = this.options.idleMs ?? DEFAULT_POLLING_IDLE_MS;
  }

  async start(onUpdate: UpdateListener): Promise<void> {
    if (this.running) {
      this.logger.warn('Polling already running; ignoring start()');
      return;
    }

    // Resolved at start, not construction: the route table is only filled at
    // bootstrap, and the derived list needs the whole handler graph.
    this.allowedUpdates = this.allowedUpdatesResolver.resolve(
      this.options.allowed_updates,
    );

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
    // Clear any webhook so getUpdates is allowed. The identity/health check
    // (getMe) is warmed transport-agnostically in NestgramBootstrap, not here.
    await this.botService.deleteWebhook({
      drop_pending_updates: this.options.dropPendingUpdates,
    });
  }

  private async loop(
    onUpdate: UpdateListener,
    signal: AbortSignal,
  ): Promise<void> {
    while (!signal.aborted) {
      let batch: RawUpdate[];
      try {
        batch = await this.fetchBatch(signal);
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

  private fetchBatch(signal: AbortSignal): Promise<RawUpdate[]> {
    return this.botService.getUpdates({
      offset: this.offset,
      limit: this.options.limit,
      timeout: this.options.timeout,
      allowed_updates: this.allowedUpdates,
      signal,
    });
  }
}

import { Injectable } from '@nestjs/common';

import { BotService } from '../../api';
import type { WebhookOptions } from '../../module/nestgram-module.types';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import { PollingOptions, PollingUpdateSource } from './polling-update-source';
import { UpdateSource } from './update-source';

/** One bot's transport config — in practice exactly one of polling / webhook. */
export interface BotTransport {
  polling?: boolean | PollingOptions;
  webhook?: WebhookOptions;
}

/**
 * Turns a bot's transport config into the update source the engine auto-manages
 * for it — the single place that knows how to BUILD a source, so
 * `NestgramBootstrap` (and the per-bot fleet) orchestrate lifecycle without
 * constructing transports themselves.
 *
 * Polling → a per-bot {@link PollingUpdateSource}. Webhook returns `null`:
 * delivery is HTTP-routed by a controller the author registers, and per-bot
 * routing isn't auto-wired yet — in a multi-bot app, write a custom
 * `UpdateSource` for a webhook bot (the single-bot webhook path is unchanged).
 */
@Injectable()
export class BotSourceFactory {
  constructor(
    private readonly allowedUpdatesResolver: AllowedUpdatesResolver,
  ) {}

  create(botService: BotService, transport: BotTransport): UpdateSource | null {
    if (transport.polling) {
      const options =
        typeof transport.polling === 'object' ? transport.polling : undefined;
      return new PollingUpdateSource(
        botService,
        options,
        this.allowedUpdatesResolver,
      );
    }
    return null;
  }
}

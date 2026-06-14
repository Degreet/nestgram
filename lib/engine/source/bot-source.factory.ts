import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { BotService } from '../../api';
import type { WebhookOptions } from '../../module/nestgram-module.types';
import { DEFAULT_BOT_NAME, getWebhookSourceToken } from '../../providers';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import { PollingOptions, PollingUpdateSource } from './polling-update-source';
import { UpdateSource } from './update-source';
import { WebhookUpdateSource } from './webhook-update-source';

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
 * Polling → a freshly built per-bot {@link PollingUpdateSource}. Webhook → the
 * per-bot {@link WebhookUpdateSource} provided under `getWebhookSourceToken(name)`
 * (resolved, NOT rebuilt, so the fleet starts the SAME instance the webhook
 * controller delivers to). Neither → `null` (no transport; e.g. a bot driven
 * externally).
 */
@Injectable()
export class BotSourceFactory {
  constructor(
    private readonly allowedUpdatesResolver: AllowedUpdatesResolver,
    private readonly moduleRef: ModuleRef,
  ) {}

  create(
    botService: BotService,
    transport: BotTransport,
    name: string = DEFAULT_BOT_NAME,
  ): UpdateSource | null {
    if (transport.polling) {
      const options =
        typeof transport.polling === 'object' ? transport.polling : undefined;
      return new PollingUpdateSource(
        botService,
        options,
        this.allowedUpdatesResolver,
      );
    }
    if (transport.webhook) {
      return this.moduleRef.get<WebhookUpdateSource>(
        getWebhookSourceToken(name),
        { strict: false },
      );
    }
    return null;
  }
}

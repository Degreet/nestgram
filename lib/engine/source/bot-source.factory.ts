import { Inject, Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { BotService } from '../../api';
import type {
  NestgramModuleOptions,
  WebhookOptions,
} from '../../module/nestgram-module.types';
import {
  DEFAULT_BOT_NAME,
  getWebhookSourceToken,
  Providers,
} from '../../providers';
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
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
  ) {}

  create(
    botService: BotService,
    transport: BotTransport,
    name: string = DEFAULT_BOT_NAME,
  ): UpdateSource | null {
    return this.applyUserSource(
      this.buildTransport(transport, botService, name),
      botService,
    );
  }

  /** Build the built-in transport source for a bot, or `null` when none is configured. */
  private buildTransport(
    transport: BotTransport,
    botService: BotService,
    name: string,
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

  /**
   * Hand the built-in source (`default`) to the user's `source` factory if one is
   * configured, so they can wrap or replace it. The single home for the seam —
   * the single-bot picker delegates here too, so both paths apply it identically.
   * With no factory, the built-in source passes through unchanged. Returns `null`
   * only when there is neither a transport nor a custom source (no source to run).
   */
  applyUserSource(
    inner: UpdateSource | null,
    botService: BotService,
  ): UpdateSource | null {
    if (!this.options.source) {
      return inner;
    }
    return this.options.source({
      default: inner ?? undefined,
      bot: botService,
      get: (token) => this.moduleRef.get(token, { strict: false }),
    });
  }
}

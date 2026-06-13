import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Type,
} from '@nestjs/common';

import { RawUpdate } from '../../events/raw-update.types';
import { Providers } from '../../providers';
import { SECRET_HEADER, WEBHOOK_PATH } from './webhook.constants';
import {
  WebhookSourceEntry,
  WebhookUpdateSource,
} from './webhook-update-source';

/**
 * Build a controller that routes inbound webhook POSTs to the right bot by a
 * `:botName` path segment — Telegram delivers to `POST /<basePath>/:botName`.
 * Register each bot's webhook at the matching URL with {@link webhookUrl}
 * (`webhookUrl(origin, name)`).
 *
 * The `:botName` path is publicly guessable, so each bot SHOULD set its own
 * `secretToken` — the controller verifies the incoming secret against THAT bot
 * before delivering (a bot left without one accepts any caller and is warned
 * about at startup, as in the single-bot case). An unknown name is a 404; a bad
 * secret a 403.
 *
 * Register the ready-made {@link MultiBotWebhookController} (served under
 * `/<WEBHOOK_PATH>/:botName`) in a module's `controllers`, or call this with a
 * custom base path. Only meaningful in a multi-bot app: it injects the
 * `WEBHOOK_SOURCES` array `NestgramModule` provides for `bots: []` — and since
 * `NestgramModule` is global, that token resolves wherever you register it.
 */
export function createMultiBotWebhookController(
  basePath: string,
): Type<unknown> {
  @Controller(basePath)
  class MultiBotWebhookController {
    private readonly byName = new Map<string, WebhookUpdateSource>();

    constructor(
      @Inject(Providers.WEBHOOK_SOURCES) entries: WebhookSourceEntry[],
    ) {
      for (const { source } of entries) {
        this.byName.set(source.name, source);
      }
    }

    @Post(':botName')
    @HttpCode(HttpStatus.OK)
    handle(
      @Param('botName') botName: string,
      @Body() update: RawUpdate,
      @Headers(SECRET_HEADER) secret?: string,
    ): void {
      const source = this.byName.get(botName);
      if (!source) {
        throw new NotFoundException(`No webhook bot named "${botName}"`);
      }
      if (!source.verifySecret(secret)) {
        throw new ForbiddenException('Invalid webhook secret token');
      }
      // Respond 200 immediately; dispatch is fire-and-forget — the dispatcher
      // isolates per-update failures, so it never throws back to Telegram.
      void source.deliver(update);
    }
  }
  return MultiBotWebhookController;
}

/**
 * Ready-made multi-bot webhook controller served at `/<WEBHOOK_PATH>/:botName`.
 * Add it to a module's `controllers` (`controllers: [MultiBotWebhookController]`)
 * and register each bot's webhook at `webhookUrl(origin, name)`. For a custom
 * base path use {@link createMultiBotWebhookController}.
 */
export const MultiBotWebhookController =
  createMultiBotWebhookController(WEBHOOK_PATH);

/**
 * Build a controller that serves EVERY bot on ONE endpoint — Telegram delivers to
 * the same `POST /<path>` for all of them (register every bot's webhook at the
 * same `webhookUrl(origin)`). A Telegram update carries no bot identity, so it
 * routes by the per-bot secret token: the bot whose `secretToken` matches the
 * incoming header gets the update. With no match it falls back to the default
 * bot; with no default either it logs and drops the update (still 200, so
 * Telegram doesn't retry-storm).
 *
 * Give each bot a DISTINCT `secretToken` for this to disambiguate — without
 * distinct secrets a shared endpoint cannot tell the bots apart and every update
 * goes to the default. For per-bot routing without relying on secrets, use
 * {@link createMultiBotWebhookController} (`:botName` in the path) instead.
 */
export function createSharedWebhookController(path: string): Type<unknown> {
  @Controller(path)
  class SharedWebhookController {
    private readonly logger = new Logger(SharedWebhookController.name);

    constructor(
      @Inject(Providers.WEBHOOK_SOURCES)
      private readonly entries: WebhookSourceEntry[],
    ) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    handle(
      @Body() update: RawUpdate,
      @Headers(SECRET_HEADER) secret?: string,
    ): void {
      const owner = this.entries.find((entry) =>
        entry.source.ownsSecret(secret),
      );
      const target = owner ?? this.entries.find((entry) => entry.isDefault);
      if (!target) {
        this.logger.warn(
          'Webhook update matched no bot secret and there is no default bot — ' +
            'dropping it. Give each bot a distinct secretToken, or mark a default.',
        );
        return;
      }
      void target.source.deliver(update);
    }
  }
  return SharedWebhookController;
}

/**
 * Ready-made shared webhook controller served at `/<WEBHOOK_PATH>` — one endpoint
 * for all bots, routed by secret token (see {@link createSharedWebhookController}).
 * Add it to a module's `controllers` and register every bot's webhook at the same
 * `webhookUrl(origin)`.
 */
export const SharedWebhookController =
  createSharedWebhookController(WEBHOOK_PATH);

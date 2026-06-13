import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Type,
} from '@nestjs/common';

import { RawUpdate } from '../../events/raw-update.types';
import { SECRET_HEADER, WEBHOOK_PATH } from './webhook.constants';
import { WebhookUpdateSource } from './webhook-update-source';

/** What a webhook controller exposes — the POST handler Telegram calls. */
export interface WebhookReceiver {
  handle(update: RawUpdate, secret?: string): void;
}

/**
 * Build a webhook controller bound to `path`. It validates the secret-token
 * header, then hands the update to {@link WebhookUpdateSource}. Use this to serve
 * the webhook on a custom route (e.g. `'direction/:botId/webhook'`); for the
 * default route register the ready-made {@link WebhookController} instead.
 *
 * The controller only does anything in an HTTP app (`NestFactory.create`); it is
 * inert under `createApplicationContext`.
 */
export function createWebhookController(path: string): Type<WebhookReceiver> {
  @Controller(path)
  class WebhookController implements WebhookReceiver {
    constructor(private readonly source: WebhookUpdateSource) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    handle(
      @Body() update: RawUpdate,
      @Headers(SECRET_HEADER) secret?: string,
    ): void {
      if (!this.source.verifySecret(secret)) {
        throw new ForbiddenException('Invalid webhook secret token');
      }
      // Respond 200 immediately; dispatch is fire-and-forget — the dispatcher
      // isolates per-update failures, so it never throws back to Telegram.
      void this.source.deliver(update);
    }
  }
  return WebhookController;
}

/**
 * Ready-made webhook controller served at the default `/telegram/webhook` route.
 *
 * The framework never auto-registers it — the bot author adds it to a module's
 * `controllers` (`controllers: [WebhookController]`), so they stay in control of
 * the route, any extra receipt-time processing, and which module owns it. For a
 * custom route use {@link createWebhookController}; for full control write your
 * own controller and forward updates via {@link WebhookUpdateSource}.
 */
export const WebhookController = createWebhookController(WEBHOOK_PATH);

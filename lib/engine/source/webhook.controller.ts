import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';

import { RawUpdate } from '../../events/raw-update.types';
import { WEBHOOK_PATH } from './webhook.constants';
import { WebhookUpdateSource } from './webhook-update-source';

/** The header Telegram sends the configured secret token in. */
const SECRET_HEADER = 'x-telegram-bot-api-secret-token';

/**
 * Receives Telegram's webhook POSTs: validates the secret-token header, then
 * hands the update to {@link WebhookUpdateSource}. Only does anything in an HTTP
 * app (the user runs `NestFactory.create`); inert under `createApplicationContext`.
 */
@Controller(WEBHOOK_PATH)
export class WebhookController {
  constructor(private readonly source: WebhookUpdateSource) {}

  @Post()
  @HttpCode(200)
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

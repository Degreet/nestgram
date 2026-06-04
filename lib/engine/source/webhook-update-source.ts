import { Inject, Injectable, Logger } from '@nestjs/common';

import { BotService } from '../../api';
import { RawUpdate } from '../../events/raw-update.types';
import { Providers } from '../../providers';
import type {
  NestgramModuleOptions,
  WebhookOptions,
} from '../../module/nestgram-module.types';
import { UpdateListener, UpdateSource } from './update-source';
import { WEBHOOK_PATH } from './webhook.constants';

/**
 * Webhook update source.
 *
 * On start it registers the webhook with Telegram (with the secret token) and
 * warns about an insecure config; updates then arrive over HTTP via
 * `WebhookController`, which calls {@link verifySecret} then {@link deliver}.
 * Implements the same {@link UpdateSource} contract as polling, so the
 * dispatcher and the rest of the engine are unchanged.
 */
@Injectable()
export class WebhookUpdateSource implements UpdateSource {
  private readonly logger = new Logger(WebhookUpdateSource.name);
  private readonly config?: WebhookOptions;
  private onUpdate?: UpdateListener;

  constructor(
    @Inject(Providers.NESTGRAM_OPTIONS) options: NestgramModuleOptions,
    private readonly botService: BotService,
  ) {
    this.config = options.webhook;
  }

  async start(onUpdate: UpdateListener): Promise<void> {
    if (!this.config) {
      return;
    }
    this.onUpdate = onUpdate;
    this.warnOnInsecureConfig(this.config);
    await this.botService.setWebhook(this.config.url, {
      secret_token: this.config.secretToken,
    });
    this.logger.log(`Webhook registered: ${this.config.url}`);
  }

  async stop(): Promise<void> {
    if (!this.config) {
      return;
    }
    await this.botService.deleteWebhook();
  }

  /**
   * Whether an incoming request's `X-Telegram-Bot-Api-Secret-Token` is trusted:
   * it must equal the configured secret. With no secret configured every request
   * is accepted (start() warned about it).
   */
  verifySecret(headerSecret?: string): boolean {
    if (!this.config?.secretToken) {
      return true;
    }
    return headerSecret === this.config.secretToken;
  }

  /** Hand a received update to the dispatcher (called by `WebhookController`). */
  deliver(update: RawUpdate): void | Promise<void> {
    return this.onUpdate?.(update);
  }

  private warnOnInsecureConfig(config: WebhookOptions): void {
    if (!config.secretToken) {
      this.logger.warn(
        `Webhook ${config.url} is set without a secretToken — anyone who ` +
          'learns the URL can spoof updates. Set webhook.secretToken.',
      );
    }
    if (this.botService.token && config.url.includes(this.botService.token)) {
      this.logger.warn(
        'Webhook URL contains the bot token — anyone who sees the URL gets ' +
          'your token. Remove it from the URL.',
      );
    }
    this.warnOnPathMismatch(config.url);
  }

  /**
   * The controller serves a fixed `/${WEBHOOK_PATH}`; if `webhook.url` points
   * elsewhere, Telegram's POSTs 404 and the bot silently gets no updates. Warn
   * at boot so the mismatch is visible.
   */
  private warnOnPathMismatch(url: string): void {
    let pathname: string;
    try {
      pathname = new URL(url).pathname;
    } catch {
      return; // malformed URL — setWebhook will surface that itself
    }
    if (pathname !== `/${WEBHOOK_PATH}`) {
      this.logger.warn(
        `Webhook URL path "${pathname}" does not match the route this app ` +
          `serves ("/${WEBHOOK_PATH}") — Telegram's updates will 404. Set ` +
          `webhook.url to end in /${WEBHOOK_PATH}.`,
      );
    }
  }
}

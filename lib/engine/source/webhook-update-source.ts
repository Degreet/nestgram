import { Inject, Injectable, Logger } from '@nestjs/common';

import { BotService } from '../../api';
import { RawUpdate } from '../../events/raw-update.types';
import { Providers } from '../../providers';
import type {
  NestgramModuleOptions,
  WebhookOptions,
} from '../../module/nestgram-module.types';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import { UpdateListener, UpdateSource } from './update-source';

/**
 * Webhook update source.
 *
 * On start it registers the webhook with Telegram (with the secret token) and
 * warns about an insecure config; updates then arrive over HTTP via a webhook
 * controller (the ready-made `WebhookController` or one the author wrote), which
 * calls {@link verifySecret} then {@link deliver}. Implements the same
 * {@link UpdateSource} contract as polling, so the dispatcher and the rest of the
 * engine are unchanged.
 */
@Injectable()
export class WebhookUpdateSource implements UpdateSource {
  private readonly logger = new Logger(WebhookUpdateSource.name);
  private readonly config?: WebhookOptions;
  private onUpdate?: UpdateListener;

  constructor(
    @Inject(Providers.NESTGRAM_OPTIONS) options: NestgramModuleOptions,
    private readonly botService: BotService,
    private readonly allowedUpdatesResolver: AllowedUpdatesResolver,
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
      // Resolved at start, not construction: the route table is only filled at
      // bootstrap, and the derived list needs the whole handler graph.
      allowed_updates: this.allowedUpdatesResolver.resolve(
        this.config.allowedUpdates,
      ),
    });
    // The framework registers the webhook with Telegram, but it does NOT mount
    // a controller — the author does. Remind here (the one moment we know a
    // webhook is configured) so a missing controller isn't a silent 404.
    this.logger.log(
      `Webhook registered: ${this.config.url} — a controller must serve this ` +
        'URL (register WebhookController or your own).',
    );
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
  }
}

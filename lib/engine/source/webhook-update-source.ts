import { Injectable, Logger } from '@nestjs/common';

import { BotService } from '../../api';
import { RawUpdate } from '../../events/raw-update.types';
import { DEFAULT_BOT_NAME } from '../../providers';
import type { WebhookOptions } from '../../module/nestgram-module.types';
import { AllowedUpdatesResolver } from './allowed-updates.resolver';
import { UpdateListener, UpdateSource } from './update-source';

/**
 * One webhook bot of a multi-bot app, paired with whether it is the app default.
 * `NestgramModule` provides these as the `WEBHOOK_SOURCES` array; the ready-made
 * multi-bot webhook controllers inject it to route an inbound POST to the right
 * bot (by `source.name` or `source.ownsSecret`).
 */
export interface WebhookSourceEntry {
  source: WebhookUpdateSource;
  isDefault: boolean;
}

/**
 * Webhook update source.
 *
 * On start it registers the webhook with Telegram (with the secret token) and
 * warns about an insecure config; updates then arrive over HTTP via a webhook
 * controller (the ready-made `WebhookController` or one the author wrote), which
 * calls {@link verifySecret} then {@link deliver}. Implements the same
 * {@link UpdateSource} contract as polling, so the dispatcher and the rest of the
 * engine are unchanged.
 *
 * Bound to ONE bot: it takes that bot's `BotService` and webhook config at
 * construction (mirroring {@link PollingUpdateSource}), so a multi-bot app builds
 * one per webhook bot. The single-bot path constructs it from the top-level
 * webhook config via a factory provider.
 */
@Injectable()
export class WebhookUpdateSource implements UpdateSource {
  private readonly logger = new Logger(WebhookUpdateSource.name);
  private onUpdate?: UpdateListener;

  constructor(
    private readonly botService: BotService,
    private readonly config: WebhookOptions | undefined,
    private readonly allowedUpdatesResolver: AllowedUpdatesResolver,
    readonly name: string = DEFAULT_BOT_NAME,
  ) {}

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
      `Webhook registered for "${this.name}": ${this.config.url} — a controller ` +
        'must serve this URL (register a webhook controller or your own).',
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

  /**
   * Whether this bot OWNS the incoming secret: a secret is configured AND the
   * header matches it. Unlike {@link verifySecret} (which accepts anything when no
   * secret is set), this is a positive identification — used to route a SHARED
   * endpoint's update to the right bot by its secret token. A bot without a
   * `secretToken` can never own a request, so it is unroutable on a shared
   * endpoint (give each bot a distinct secret).
   */
  ownsSecret(headerSecret?: string): boolean {
    return (
      this.config?.secretToken !== undefined &&
      headerSecret === this.config.secretToken
    );
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

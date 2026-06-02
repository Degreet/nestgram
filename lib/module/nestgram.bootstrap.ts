import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import { BotService } from '../api';
import { RouteExplorer, RouteTable } from '../engine/discovery';
import { Providers } from '../providers';
import { UpdateDispatcher } from '../engine/dispatcher';
import { PollingUpdateSource, UpdateSource } from '../engine/source';
import { NestgramModuleOptions } from './nestgram-module.types';

/** Telegram bot tokens look like `123456789:AA...` (id colon secret). */
const TELEGRAM_TOKEN_PATTERN = /^\d+:[\w-]+$/;

/**
 * Wires the engine together at application boot and tears it down on shutdown.
 *
 * On `OnApplicationBootstrap` (after every provider exists, so discovery sees
 * the whole graph) it builds the route table ONCE, then — if a transport is
 * configured — starts the update source with the dispatcher as the listener.
 * On shutdown it stops the source so polling ends cleanly instead of dropping
 * mid-flight updates (this needs `app.enableShutdownHooks()`).
 */
@Injectable()
export class NestgramBootstrap
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NestgramBootstrap.name);
  private source?: UpdateSource;

  constructor(
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
    private readonly routeExplorer: RouteExplorer,
    private readonly routeTable: RouteTable,
    private readonly dispatcher: UpdateDispatcher,
    private readonly botService: BotService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.validateToken();
    this.warnOnInsecureWebhook();

    this.routeTable.set(this.routeExplorer.explore());
    this.logger.log(`Route table built: ${this.routeTable.size} route(s)`);

    if (this.options.polling) {
      const pollingOptions =
        this.options.polling === true ? {} : this.options.polling;
      this.source = new PollingUpdateSource(this.botService, pollingOptions);
      await this.source.start((update) => this.dispatcher.dispatch(update));
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.source?.stop();
  }

  /**
   * A token is mandatory; a malformed one is a likely misconfiguration.
   *
   * Runs at boot (not in `forRoot`) on purpose: `forRootAsync` resolves the
   * token via DI, so boot is the only place that covers both entry points.
   */
  private validateToken(): void {
    const token = this.options.token;
    if (typeof token !== 'string' || token.trim() === '') {
      throw new Error(
        'Nestgram: a bot token is required — pass it to NestgramModule.forRoot({ token }).',
      );
    }
    if (!TELEGRAM_TOKEN_PATTERN.test(token)) {
      this.logger.warn(
        'Bot token does not look like a Telegram token (expected "<id>:<secret>").',
      );
    }
  }

  /** A webhook without a secret token lets anyone who learns the URL spoof updates. */
  private warnOnInsecureWebhook(): void {
    const webhook = this.options.webhook;
    if (webhook && !webhook.secretToken) {
      this.logger.warn(
        `Webhook ${webhook.url} is configured without a secretToken — anyone who learns the URL can spoof updates. Set webhook.secretToken.`,
      );
    }
  }
}

import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import { BotService } from '../api';
import { RouteExplorer, RouteTable } from '../engine/discovery';
import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import { UpdateDispatcher } from '../engine/dispatcher';
import { PollingUpdateSource } from '../engine/source';
import { NestgramModuleOptions } from './nestgram-module.types';

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
  /** Telegram bot tokens look like `123456789:AA...` (id colon secret). */
  private static readonly TOKEN_PATTERN = /^\d+:[\w-]+$/;

  private readonly logger = new Logger(NestgramBootstrap.name);

  constructor(
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
    private readonly routeExplorer: RouteExplorer,
    private readonly routeTable: RouteTable,
    private readonly dispatcher: UpdateDispatcher,
    private readonly source: PollingUpdateSource,
    private readonly botService: BotService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.validateToken();
    this.warnOnInsecureWebhook();

    const routes = this.routeExplorer.explore();
    this.routeTable.set(routes);
    this.logger.log(`Route table built: ${routes.length} route(s)`);
    for (const route of routes) {
      const router = route.instance.constructor.name;
      this.logger.debug(
        `Mapped ${router}.${route.methodName} → ${route.updateType}`,
      );
    }

    await this.warmBotIdentity();

    if (this.options.polling) {
      await this.source.start((update) => this.dispatcher.dispatch(update));
    }
  }

  /**
   * Load the bot's identity once, before the transport starts, so `bot.username`
   * / `bot.deepLink()` work inside any handler (the `getMe` result is cached on
   * `BotService`) and a bad token fails fast. This is the transport-agnostic
   * home for identity warming — gated on polling for now (the only transport
   * that processes updates); the webhook source (Phase 2) warms it the same way,
   * by extending this gate. A no-transport boot (e.g. tests) hits no network.
   */
  private async warmBotIdentity(): Promise<void> {
    if (!this.options.polling) {
      return;
    }
    const me = await this.botService.getMe();
    this.logger.log(`Connected as @${me.username}`);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.source.stop();
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
      throw new NestgramConfigError(
        'A bot token is required — pass it to NestgramModule.forRoot({ token }).',
      );
    }
    if (!NestgramBootstrap.TOKEN_PATTERN.test(token)) {
      this.logger.warn(
        'Bot token does not look like a Telegram token (expected "<id>:<secret>").',
      );
    }
  }

  private warnOnInsecureWebhook(): void {
    const webhook = this.options.webhook;
    if (!webhook) {
      return;
    }
    if (!webhook.secretToken) {
      this.logger.warn(
        `Webhook ${webhook.url} is configured without a secretToken — anyone who learns the URL can spoof updates. Set webhook.secretToken.`,
      );
    }
    // A bot token in the webhook URL leaks full control to anyone with the URL.
    if (this.options.token && webhook.url.includes(this.options.token)) {
      this.logger.warn(
        'Webhook URL contains the bot token — anyone who sees the URL gets your token. Remove it from the URL.',
      );
    }
  }
}

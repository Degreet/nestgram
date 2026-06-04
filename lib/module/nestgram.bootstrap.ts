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
 *
 * Token validation lives in {@link BotService} (where the token is used, so it
 * can't be bypassed); webhook secret-token validation belongs in `setWebhook`
 * (Phase 2). This class is just engine wiring.
 */
@Injectable()
export class NestgramBootstrap
  implements OnApplicationBootstrap, OnApplicationShutdown
{
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
}

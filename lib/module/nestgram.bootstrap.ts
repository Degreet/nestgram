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
import { UpdateSource } from '../engine/source';
import { NestgramModuleOptions } from './nestgram-module.types';

/**
 * Wires the engine together at application boot and tears it down on shutdown.
 *
 * On `OnApplicationBootstrap` (after every provider exists, so discovery sees
 * the whole graph) it builds the route table ONCE, then — if a transport is
 * configured — starts the configured update source (polling or webhook) with the
 * dispatcher as the listener. On shutdown it stops the source so delivery ends
 * cleanly instead of dropping mid-flight updates (needs `app.enableShutdownHooks()`).
 *
 * Token validation lives in {@link BotService} (where the token is used, so it
 * can't be bypassed). This class is just engine wiring; the transport is chosen
 * by the `UPDATE_SOURCE` provider.
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
    @Inject(Providers.UPDATE_SOURCE)
    private readonly source: UpdateSource,
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

    if (this.hasTransport()) {
      await this.source.start((update) => this.dispatcher.dispatch(update));
    }
  }

  /**
   * Load the bot's identity once, before the transport starts, so `bot.username`
   * / `bot.deepLink()` work inside any handler (the `getMe` result is cached on
   * `BotService`) and a bad token fails fast. The transport-agnostic home for
   * identity warming. A no-transport boot (e.g. tests) hits no network.
   */
  private async warmBotIdentity(): Promise<void> {
    if (!this.hasTransport()) {
      return;
    }
    const me = await this.botService.getMe();
    this.logger.log(`Connected as @${me.username}`);
  }

  private hasTransport(): boolean {
    return Boolean(this.options.polling || this.options.webhook);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.source.stop();
  }
}

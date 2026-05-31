import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

import { BotService } from '../bot';
import { RouteExplorer, RouteTable } from '../discovery';
import { Providers } from '../enums';
import { UpdateDispatcher } from '../runtime';
import { PollingUpdateSource, UpdateSource } from '../source';
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
}

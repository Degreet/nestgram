import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { BotService } from '../api';
import { RouteExplorer, RouteTable } from '../engine/discovery';
import { getBotToken, Providers } from '../providers';
import {
  StageExplorer,
  StageRegistry,
  UpdateDispatcher,
} from '../engine/dispatcher';
import { BotSourceFactory, UpdateSource } from '../engine/source';
import { BotConfigResolver } from './bot-config';
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
  /** Per-bot sources started for a multi-bot config (one per bot with a transport). */
  private readonly fleet: UpdateSource[] = [];

  constructor(
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
    private readonly routeExplorer: RouteExplorer,
    private readonly routeTable: RouteTable,
    private readonly stageExplorer: StageExplorer,
    private readonly stageRegistry: StageRegistry,
    private readonly dispatcher: UpdateDispatcher,
    @Inject(Providers.UPDATE_SOURCE)
    private readonly source: UpdateSource,
    private readonly botService: BotService,
    private readonly moduleRef: ModuleRef,
    private readonly sourceFactory: BotSourceFactory,
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

    const stages = this.stageExplorer.explore();
    this.stageRegistry.set(stages);
    this.logger.log(`Pipeline stages: ${stages.length}`);

    if (this.hasTransport()) {
      // Single-bot via the top-level transport: the existing default-bot source.
      await this.warmBotIdentity();
      await this.source.start((update) => this.dispatcher.dispatch(update));
    } else {
      // Per-bot transport (a `bots: []` config): one poller per polling bot.
      await this.startFleet();
    }
  }

  /**
   * Multi-bot transport: build and start one source per bot via
   * {@link BotSourceFactory}, each dispatching with its OWN BotService so a reply
   * goes back through the bot that received the update. The factory returns no
   * source for a webhook bot (per-bot webhook delivery isn't auto-wired) — warn,
   * since such a bot needs a custom update source to receive.
   */
  private async startFleet(): Promise<void> {
    const bots = BotConfigResolver.resolve(this.options);
    for (const bot of bots) {
      const botService = this.moduleRef.get<BotService>(getBotToken(bot.name), {
        strict: false,
      });
      const source = this.sourceFactory.create(botService, {
        polling: bot.polling,
        webhook: bot.webhook,
      });
      if (!source) {
        if (bot.webhook) {
          this.logger.warn(
            `Bot "${bot.name}" uses webhook, which isn't auto-wired per-bot yet — ` +
              `give it a custom update source to receive updates.`,
          );
        }
        continue;
      }
      const me = await botService.getMe();
      this.logger.log(`Bot "${bot.name}" connected as @${me.username}`);
      await source.start((update) =>
        this.dispatcher.dispatch(update, botService),
      );
      this.fleet.push(source);
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
    await Promise.all(this.fleet.map((source) => source.stop()));
  }
}

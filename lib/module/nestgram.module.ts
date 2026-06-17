import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, DiscoveryModule } from '@nestjs/core';

import { BotModule, BotService } from '../api';
import { BotOptions } from '../api/bot-options';
import { BotConfigResolver, ResolvedBot } from './bot-config';
import { ContextFactory, EventFactory } from '../engine/context';
import {
  RouteExplorer,
  RouteMatcher,
  RouteTable,
  RouteTransformExplorer,
  UnhandledExplorer,
  UnhandledRegistry,
} from '../engine/discovery';
import { NestgramConfigError } from '../exceptions';
import {
  DEFAULT_BOT_NAME,
  getBotToken,
  getWebhookSourceToken,
  Providers,
} from '../providers';
import { HandlerExecutorFactory, ResultHandler } from '../engine/execution';
import {
  StageExplorer,
  StageRegistry,
  UpdateDispatcher,
} from '../engine/dispatcher';
import {
  AllowedUpdatesResolver,
  BotSourceFactory,
  PollingUpdateSource,
  UpdateSource,
  WebhookSourceEntry,
  WebhookUpdateSource,
} from '../engine/source';
import { AutoAnswerCallbackInterceptor } from '../builtins/auto-answer';
import { ReplyExceptionFilter } from '../builtins/reply-exception';
import { DeadButtonWarner } from '../builtins/unhandled';
import { NestgramBootstrap } from './nestgram.bootstrap';
import {
  NestgramModuleAsyncOptions,
  NestgramModuleOptions,
  NestgramOptionsFactory,
} from './nestgram-module.types';

/**
 * The framework entry point. `forRoot`/`forRootAsync` configure the bot (token,
 * transport) and register the engine providers; routers are discovered, not
 * listed.
 *
 * Imports Nest's `DiscoveryModule` (so `DiscoveryService`/`MetadataScanner` are
 * injectable for route discovery) and `BotModule` (for `BotService`). Handler
 * execution uses Nest's `ExternalContextCreator`, resolved from the core
 * internals — no need to provide it here.
 *
 * `BotModule` stays internal: bot authors only ever touch `NestgramModule`,
 * which owns option resolution and feeds the token down.
 */
@Global()
@Module({})
export class NestgramModule {
  /** Engine providers — identical for the sync and async entry points. */
  private static readonly engineProviders: Provider[] = [
    EventFactory,
    ContextFactory,
    RouteExplorer,
    RouteTransformExplorer,
    RouteTable,
    RouteMatcher,
    UnhandledExplorer,
    UnhandledRegistry,
    HandlerExecutorFactory,
    ResultHandler,
    // The dispatcher runs per-update stages discovered + ordered at boot. The
    // stages themselves live in their own modules a user imports — i18n in
    // I18nModule, sessions in SessionModule — so nothing here is privileged; a
    // user adds their own with @UpdateStage.
    StageExplorer,
    StageRegistry,
    UpdateDispatcher,
    AllowedUpdatesResolver,
    // Builds the per-bot update source for the multi-bot fleet (NestgramBootstrap
    // uses it instead of constructing sources itself).
    BotSourceFactory,
    // Built per-bot now (one poller per bot). The single-bot path constructs it
    // from the top-level polling config; multi-bot builds its own per bot.
    {
      provide: PollingUpdateSource,
      useFactory: (
        options: NestgramModuleOptions,
        bot: BotService,
        resolver: AllowedUpdatesResolver,
      ): PollingUpdateSource =>
        new PollingUpdateSource(
          bot,
          typeof options.polling === 'object' ? options.polling : undefined,
          resolver,
        ),
      inject: [Providers.NESTGRAM_OPTIONS, BotService, AllowedUpdatesResolver],
    },
    // The single-bot webhook source, built from the top-level webhook config.
    // Multi-bot builds its own per bot (see webhookSourceProviders).
    {
      provide: WebhookUpdateSource,
      useFactory: (
        options: NestgramModuleOptions,
        bot: BotService,
        resolver: AllowedUpdatesResolver,
      ): WebhookUpdateSource =>
        new WebhookUpdateSource(bot, options.webhook, resolver),
      inject: [Providers.NESTGRAM_OPTIONS, BotService, AllowedUpdatesResolver],
    },
    // The active transport, chosen by config: webhook if configured, else
    // polling — then run through the user's `source` factory (wrap/replace) via
    // the same BotSourceFactory the fleet uses, so the seam applies identically.
    // Bootstrap injects UPDATE_SOURCE and only starts it when a transport is set;
    // the no-transport-but-custom-source case is handled on the fleet path.
    {
      provide: Providers.UPDATE_SOURCE,
      useFactory: (
        options: NestgramModuleOptions,
        polling: PollingUpdateSource,
        webhook: WebhookUpdateSource,
        botService: BotService,
        factory: BotSourceFactory,
      ): UpdateSource => {
        const inner = options.webhook
          ? webhook
          : options.polling
          ? polling
          : null;
        // No top-level transport: this provider's source is NOT started (the
        // bootstrap's hasTransport gate is false) — the fleet path owns building
        // and starting any custom source. Skip decoration here so the user's
        // `source` factory isn't invoked a second time (building a stray,
        // never-stopped instance). Resolve to the inert polling placeholder.
        if (inner === null) {
          return polling;
        }
        // Apply the user `source` factory + the default update queue, the same
        // composition the fleet uses.
        return factory.decorate(inner, botService) ?? polling;
      },
      inject: [
        Providers.NESTGRAM_OPTIONS,
        PollingUpdateSource,
        WebhookUpdateSource,
        BotService,
        BotSourceFactory,
      ],
    },
    NestgramBootstrap,
    // Built-ins as ordinary public providers (no privileged core). Auto-answer
    // is a global interceptor that self-disables when the option is off, so it
    // stays uniform across forRoot / forRootAsync.
    { provide: APP_INTERCEPTOR, useClass: AutoAnswerCallbackInterceptor },
    // Maps a thrown ReplyException/AnswerException to a Telegram reply via a
    // global @Catch filter; self-disables (re-throws) when replyExceptions is
    // false. Same "public toggleable built-in" shape as the interceptor above.
    { provide: APP_FILTER, useClass: ReplyExceptionFilter },
    // The dead-button warning, shipped as a default `@OnUnhandled` handler (a
    // `@Router` discovered like any other) — public and toggleable via
    // `warnUnhandledCallbacks`, so nothing here is privileged.
    DeadButtonWarner,
  ];

  /**
   * `NESTGRAM_OPTIONS` is exported so the (internal) `BotModule` can inject it
   * in the async path to read the resolved token. `WebhookUpdateSource` is
   * exported so a webhook controller the author registers in their own module
   * (the ready-made one or a custom one) can inject it to verify + deliver.
   */
  private static readonly engineExports = [
    UpdateDispatcher,
    RouteTable,
    WebhookUpdateSource,
    Providers.NESTGRAM_OPTIONS,
    // Exported so a feature module (e.g. ScenesModule) can build its own ECC
    // invokers for handlers it runs imperatively (scene `@OnEnter`/`@OnLeave`).
    HandlerExecutorFactory,
  ];

  /**
   * Resolve the SINGLE bot for the async path. `forRootAsync` builds its bot from
   * a runtime factory, so the count can't be known at module-definition time —
   * multiple bots there would need dynamic provider tokens, which Nest can't do.
   * Dynamic multi-bot is out of scope; declare several bots statically with
   * `forRoot({ bots: [...] })` instead.
   */
  private static resolveSingleBot(options: NestgramModuleOptions): BotOptions {
    const [bot, ...more] = BotConfigResolver.resolve(options);
    if (more.length > 0) {
      throw new NestgramConfigError(
        'forRootAsync resolves a single bot — for several bots use ' +
          'forRoot({ bots: [...] }) with a static array.',
      );
    }
    return bot.options;
  }

  static forRoot(options: NestgramModuleOptions): DynamicModule {
    const bots = BotConfigResolver.resolve(options);
    const defaultBot = bots.find((bot) => bot.isDefault);
    // The engine constructs against a bare BotService. Alias it to the default;
    // with no default (co-equal bots) alias to the first bot as an INTERNAL
    // placeholder that is NOT exported, so a user's bare `BotService` injection
    // still fails and forces `@InjectBot(name)`.
    const engineBot = defaultBot ?? bots[0];
    // Multi-bot only: per-bot webhook sources + the WEBHOOK_SOURCES aggregate the
    // ready-made multi-bot webhook controllers inject. The single-bot path uses
    // the class-token WebhookUpdateSource above.
    const isMultiBot = Array.isArray(options.bots);
    // The class-token WebhookUpdateSource is the SINGLE-bot source (built from the
    // top-level webhook config). In a multi-bot app it has no config and is a
    // no-op that accepts every secret — don't export it (multi-bot webhook goes
    // through WEBHOOK_SOURCES); it stays provided only for the UPDATE_SOURCE picker.
    const engineExports = isMultiBot
      ? this.engineExports.filter((token) => token !== WebhookUpdateSource)
      : this.engineExports;
    const baseExports = defaultBot
      ? [...engineExports, BotService]
      : [...engineExports];
    return {
      module: NestgramModule,
      imports: [
        // One isolated module per bot; each exports its BotService under
        // getBotToken(name). The engine drives the default bot (Phase 2 adds a
        // per-bot source); the rest are reachable via @InjectBot for sends.
        ...bots.map((bot) => BotModule.forBot(bot.name, bot.options)),
        DiscoveryModule,
      ],
      // No controllers: the webhook receiver isn't auto-registered. The author
      // adds `WebhookController` (or their own) to a module's `controllers` — see
      // the WebhookOptions docs.
      providers: [
        { provide: Providers.NESTGRAM_OPTIONS, useValue: options },
        // A bare BotService (and @InjectBot() with no name) resolves the default
        // bot — exported only when one exists.
        { provide: BotService, useExisting: getBotToken(engineBot.name) },
        ...this.engineProviders,
        ...(isMultiBot ? this.webhookSourceProviders(bots) : []),
      ],
      exports: isMultiBot
        ? [...baseExports, Providers.WEBHOOK_SOURCES]
        : baseExports,
    };
  }

  /**
   * Per-bot webhook plumbing for a multi-bot app: one {@link WebhookUpdateSource}
   * under `getWebhookSourceToken(name)` for each webhook bot (it registers the
   * webhook on start and verifies + delivers received updates), plus the
   * `WEBHOOK_SOURCES` aggregate the ready-made multi-bot webhook controllers
   * inject to route an inbound POST to the right bot. Empty (just the aggregate,
   * resolving to `[]`) when no bot uses webhook, so the export is always valid.
   */
  private static webhookSourceProviders(bots: ResolvedBot[]): Provider[] {
    const webhookBots = bots.filter((bot) => bot.webhook);
    const sources: Provider[] = webhookBots.map((bot) => ({
      provide: getWebhookSourceToken(bot.name),
      useFactory: (
        botService: BotService,
        resolver: AllowedUpdatesResolver,
      ): WebhookUpdateSource =>
        new WebhookUpdateSource(botService, bot.webhook, resolver, bot.name),
      inject: [getBotToken(bot.name), AllowedUpdatesResolver],
    }));
    const aggregate: Provider = {
      provide: Providers.WEBHOOK_SOURCES,
      useFactory: (...resolved: WebhookUpdateSource[]): WebhookSourceEntry[] =>
        webhookBots.map((bot, index) => ({
          source: resolved[index],
          isDefault: bot.isDefault,
        })),
      inject: webhookBots.map((bot) => getWebhookSourceToken(bot.name)),
    };
    return [...sources, aggregate];
  }

  static forRootAsync(options: NestgramModuleAsyncOptions): DynamicModule {
    return {
      module: NestgramModule,
      imports: [
        ...(options.imports ?? []),
        BotModule.forBotAsync(DEFAULT_BOT_NAME, {
          inject: [Providers.NESTGRAM_OPTIONS],
          useFactory: (resolved: NestgramModuleOptions) =>
            NestgramModule.resolveSingleBot(resolved),
          // Static (a class can't resolve through the value factory) — like apiInterceptors.
          apiInterceptors: options.apiInterceptors,
          throttler: options.throttler,
        }),
        DiscoveryModule,
      ],
      // No controllers: same as forRoot — the author registers the webhook
      // receiver themselves. Uniform across sync/async (the async config never
      // had to be known here to wire a route).
      providers: [
        ...this.createAsyncOptionsProviders(options),
        { provide: BotService, useExisting: getBotToken(DEFAULT_BOT_NAME) },
        ...this.engineProviders,
      ],
      exports: [...this.engineExports, BotService],
    };
  }

  /** Resolve `NESTGRAM_OPTIONS` from a factory / class / existing provider. */
  private static createAsyncOptionsProviders(
    options: NestgramModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: Providers.NESTGRAM_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const optionsFactory = options.useClass ?? options.useExisting;
    if (!optionsFactory) {
      throw new NestgramConfigError(
        'NestgramModule.forRootAsync requires one of useFactory, useClass or useExisting',
      );
    }

    const providers: Provider[] = [
      {
        provide: Providers.NESTGRAM_OPTIONS,
        useFactory: (factory: NestgramOptionsFactory) =>
          factory.createNestgramOptions(),
        inject: [optionsFactory],
      },
    ];

    if (options.useClass) {
      providers.push({ provide: options.useClass, useClass: options.useClass });
    }

    return providers;
  }
}

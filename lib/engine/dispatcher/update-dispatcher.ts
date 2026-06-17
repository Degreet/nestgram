import { Injectable, Logger } from '@nestjs/common';

import type { BotService } from '../../api';
import { runAmbient } from '../../ambient';
import { ContextFactory, TelegramExecutionContext } from '../context';
import {
  HandlerExecutorFactory,
  HandlerInvoker,
  ResultHandler,
} from '../execution';
import {
  Route,
  RouteMatcher,
  RouteTable,
  UnhandledHandler,
  UnhandledRegistry,
} from '../discovery';
import { StageRegistry } from './stage-registry';
import { RawUpdate } from '../../events/raw-update.types';

/**
 * Routes one update through the new engine, end to end:
 *
 *   wrap (no mutation) -> find matches -> first match -> invoke via ECC
 *   (full Nest pipeline) -> handle the return value.
 *
 * First-match routing (docs/01, aiogram-style): the first route in declaration
 * order whose filters pass wins. The ordered remainder is where a future
 * `@Next()`/skip will fall through.
 *
 * Per-update isolation: `dispatch` never throws. The update source awaits it in
 * its poll loop, so an unhandled error here would kill polling; instead we log
 * and move on, keeping one bad update from taking down the bot.
 *
 * Invokers are built once per route (ECC `create` is not free) and cached, so
 * steady-state dispatch only does matching + the cached call.
 */
@Injectable()
export class UpdateDispatcher {
  private readonly logger = new Logger(UpdateDispatcher.name);
  private readonly invokers = new WeakMap<Route, HandlerInvoker>();
  private readonly unhandledInvokers = new WeakMap<
    UnhandledHandler,
    HandlerInvoker
  >();

  constructor(
    private readonly contextFactory: ContextFactory,
    private readonly routeTable: RouteTable,
    private readonly routeMatcher: RouteMatcher,
    private readonly executorFactory: HandlerExecutorFactory,
    private readonly resultHandler: ResultHandler,
    private readonly stages: StageRegistry,
    private readonly unhandledRegistry: UnhandledRegistry,
  ) {}

  /**
   * `bot` is the bot whose source delivered this update; threaded into the
   * context so replies go back through it. Omitted (single-bot, tests) → the
   * context uses the default bot.
   */
  async dispatch(update: RawUpdate, bot?: BotService): Promise<void> {
    // Each update runs inside its own ambient context, so sessions, locale/`t()`
    // and any user stage are reachable anywhere in the call chain without a ctx arg.
    await runAmbient(async () => {
      try {
        const ctx = this.contextFactory.wrap(update, bot);
        if (!ctx) {
          return;
        }

        const stages = this.stages.all();

        // Apply every stage before matching — so locale, session and any user
        // stage have seeded the ambient store before guards/matching/handler run.
        for (const stage of stages) {
          await stage.apply(ctx);
        }

        const [route] = await this.routeMatcher.findMatches(
          this.routeTable,
          ctx,
        );
        if (route) {
          // A static-reply route (a scene step's `invalid` reprompt) skips the
          // handler entirely — its return value IS the reply string.
          const result =
            route.reply !== undefined
              ? route.reply
              : await this.invokerFor(route)(ctx);
          await this.resultHandler.handle(result, ctx);
        } else if (this.unhandledRegistry.all().length > 0) {
          await this.runUnhandled(ctx);
        } else {
          // No route and no `@OnUnhandled` handler — nothing ran, so there is
          // nothing to commit; leave the store as the stages loaded it.
          return;
        }

        // Commit only on success — a thrown handler skips commit, keeping the
        // store as it was. Reached after a matched OR an `@OnUnhandled` handler
        // ran, so a session write inside an `@OnUnhandled` handler persists like
        // any other (runUnhandled isolates per-handler throws so it never aborts
        // the commit).
        for (const stage of stages) {
          await stage.commit?.(ctx);
        }
      } catch (error) {
        this.logger.error(
          `Failed to dispatch update #${update.update_id}`,
          error as Error,
        );
      }
    });
  }

  /**
   * No route matched — run every `@OnUnhandled` handler through the full Nest
   * pipeline (so guards/interceptors apply and a returned value replies). They
   * all run: these handlers observe rather than compete, so there is no
   * first-match here. The built-in dead-button warning is one of them.
   */
  private async runUnhandled(ctx: TelegramExecutionContext): Promise<void> {
    for (const handler of this.unhandledRegistry.all()) {
      // Each handler is an independent observer — isolate failures so one bad
      // handler can't starve the rest (e.g. the built-in dead-button warning).
      try {
        const result = await this.unhandledInvokerFor(handler)(ctx);
        await this.resultHandler.handle(result, ctx);
      } catch (error) {
        this.logger.error(
          `@OnUnhandled handler "${handler.methodName}" failed`,
          error as Error,
        );
      }
    }
  }

  private unhandledInvokerFor(handler: UnhandledHandler): HandlerInvoker {
    let invoker = this.unhandledInvokers.get(handler);
    if (!invoker) {
      invoker = this.executorFactory.create(
        handler.instance,
        handler.methodName,
      );
      this.unhandledInvokers.set(handler, invoker);
    }
    return invoker;
  }

  private invokerFor(route: Route): HandlerInvoker {
    let invoker = this.invokers.get(route);
    if (!invoker) {
      invoker = this.executorFactory.create(route.instance, route.methodName);
      this.invokers.set(route, invoker);
    }
    return invoker;
  }
}

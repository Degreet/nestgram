import { Injectable, Logger } from '@nestjs/common';

import { runAmbient } from '../../ambient';
import { SessionManager } from '../../sessions';
import { I18nManager } from '../../i18n';
import { ContextFactory } from '../context';
import {
  HandlerExecutorFactory,
  HandlerInvoker,
  ResultHandler,
} from '../execution';
import { Route, RouteMatcher, RouteTable } from '../discovery';
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

  constructor(
    private readonly contextFactory: ContextFactory,
    private readonly routeTable: RouteTable,
    private readonly routeMatcher: RouteMatcher,
    private readonly executorFactory: HandlerExecutorFactory,
    private readonly resultHandler: ResultHandler,
    private readonly sessions: SessionManager,
    private readonly i18n: I18nManager,
  ) {}

  async dispatch(update: RawUpdate): Promise<void> {
    // Each update runs inside its own ambient context, so sessions (and later
    // locale/`t()`) are reachable anywhere in the call chain without a ctx arg.
    await runAmbient(async () => {
      try {
        const ctx = this.contextFactory.wrap(update);
        if (!ctx) {
          return;
        }

        // Resolve locale + load the session before matching, so guards/matching
        // (and a future FSM) can read locale and route on state.
        this.i18n.resolve(ctx);
        await this.sessions.load(ctx);

        const [route] = await this.routeMatcher.findMatches(
          this.routeTable,
          ctx,
        );
        if (!route) {
          return;
        }

        const result = await this.invokerFor(route)(ctx);
        await this.resultHandler.handle(result, ctx);

        // Persist only on success — a thrown handler leaves the session as-is.
        await this.sessions.save();
      } catch (error) {
        this.logger.error(
          `Failed to dispatch update #${update.update_id}`,
          error as Error,
        );
      }
    });
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

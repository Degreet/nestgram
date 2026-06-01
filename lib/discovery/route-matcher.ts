import { Injectable } from '@nestjs/common';

import { TelegramExecutionContext } from '../context';
import { Route } from './route.types';
import { RouteTable } from './route-table';

/**
 * Route matching for the engine — selects which handlers apply to an update.
 *
 * A provider (not a free function) because matching is core routing behaviour
 * the framework may want swappable: a project can override `RouteMatcher` via DI
 * to change how routes are selected. `UpdateDispatcher` injects it.
 *
 * A route matches when its `updateType` equals the resolved kind and every
 * declared filter passes. Filters receive the rich event plus the execution
 * context, may be async, run sequentially, and short-circuit on first rejection.
 */
@Injectable()
export class RouteMatcher {
  /**
   * All routes that match the update, in declaration order.
   *
   * Only walks the candidates for the update's kind (the table is pre-indexed by
   * type), so an update never evaluates filters for unrelated handlers.
   * First-match routing takes `[0]`; the ordered remainder is what a future
   * `@Next()`/skip mechanism falls through to.
   */
  async findMatches(
    table: RouteTable,
    ctx: TelegramExecutionContext,
  ): Promise<Route[]> {
    const matches: Route[] = [];

    for (const route of table.ofType(ctx.kind)) {
      if (await this.matches(route, ctx)) {
        matches.push(route);
      }
    }

    return matches;
  }

  private async matches(
    route: Route,
    ctx: TelegramExecutionContext,
  ): Promise<boolean> {
    if (route.updateType !== ctx.kind) {
      return false;
    }

    for (const filter of route.filters) {
      const passed = await filter.canActivate(ctx.event, ctx);
      if (!passed) {
        return false;
      }
    }

    return true;
  }
}

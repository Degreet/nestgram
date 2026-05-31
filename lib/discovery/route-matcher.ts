import { TelegramExecutionContext } from '../context';
import { Route } from './route.types';
import { RouteTable } from './route-table';

/**
 * Pure route matching for the new engine.
 *
 * A route matches an update when its `updateType` equals the resolved kind and
 * every declared filter's `canActivate` returns truthy. Filters receive the
 * rich event (the same value the legacy `FilterService` passed as
 * `update._telegramObject`) plus the execution context, and may be async — so
 * matching is async too. Filters run sequentially and short-circuit on the
 * first rejection (no point evaluating the rest).
 */
export async function matchesRoute(
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

/**
 * All routes that match the update, in declaration order.
 *
 * Only walks the candidates for the update's kind (the table is pre-indexed by
 * type), so an update never evaluates filters for unrelated handlers. First-match
 * routing takes `[0]`; the ordered remainder is what a future `@Next()`/skip
 * mechanism falls through to.
 */
export async function findMatches(
  table: RouteTable,
  ctx: TelegramExecutionContext,
): Promise<Route[]> {
  const matches: Route[] = [];

  for (const route of table.ofType(ctx.kind)) {
    if (await matchesRoute(route, ctx)) {
      matches.push(route);
    }
  }

  return matches;
}

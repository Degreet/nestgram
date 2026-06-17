import type { TelegramExecutionContext } from '../engine/context';
import type { PrefixablePredicate, RoutePredicate } from '../engine/matching';
import { CallbackRoutePattern } from './callback-route-pattern';

/**
 * The route predicate behind a string `@Action('done/:id')`. Matches a callback
 * query whose `data` fits the compiled {@link CallbackRoutePattern}.
 *
 * Prefixable: `@Router('ns')` namespaces it at discovery via {@link withPrefix},
 * so `done/:id` matches `ns/done/:id`. {@link extract} exposes the captured
 * parameters to `@Param()`, which re-runs the match (with the router prefix) on
 * the handler that actually ran — never confused by a sibling route.
 *
 * Imports from `engine` are type-only, so it adds no runtime edge back onto the
 * engine (no module cycle).
 */
export class CallbackRoutePredicate
  implements RoutePredicate, PrefixablePredicate
{
  constructor(private readonly pattern: CallbackRoutePattern) {}

  matches(ctx: TelegramExecutionContext): boolean {
    const data = ctx.update.callback_query?.data;
    return data !== undefined && this.pattern.match(data) !== null;
  }

  /** Captured parameters for `data`, or `null` if it isn't this route's. */
  extract(data: string): Record<string, string> | null {
    return this.pattern.match(data);
  }

  withPrefix(prefix: string): CallbackRoutePredicate {
    return new CallbackRoutePredicate(this.pattern.withPrefix(prefix));
  }
}

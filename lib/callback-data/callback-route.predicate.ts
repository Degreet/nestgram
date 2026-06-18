import type { TelegramExecutionContext } from '../engine/context';
import type {
  PrefixablePredicate,
  RouteParamSource,
  RoutePredicate,
} from '../engine/matching';
import { CallbackRoutePattern } from './callback-route-pattern';

/**
 * The route predicate behind a string `@Action('done/:id')`. Matches a callback
 * query whose `data` fits the compiled {@link CallbackRoutePattern}.
 *
 * Prefixable: `@Router('ns')` namespaces it at discovery via {@link withPrefix},
 * so `done/:id` matches `ns/done/:id`. {@link extractParams} exposes the captured
 * parameters to `@Param()` — re-applying the router prefix, since the listener
 * metadata holds the unprefixed predicate — so the handler that actually ran is
 * never confused by a sibling route.
 *
 * Imports from `engine` are type-only, so it adds no runtime edge back onto the
 * engine (no module cycle).
 */
export class CallbackRoutePredicate
  implements RoutePredicate, PrefixablePredicate, RouteParamSource
{
  constructor(private readonly pattern: CallbackRoutePattern) {}

  matches(ctx: TelegramExecutionContext): boolean {
    const data = ctx.update.callback_query?.data;
    return data !== undefined && this.pattern.match(data) !== null;
  }

  /** Captured parameters for the callback data, or `null` if it isn't this route's. */
  extractParams(
    ctx: TelegramExecutionContext,
    prefix: string | undefined,
  ): Record<string, string> | null {
    const data = ctx.update.callback_query?.data;
    if (data === undefined) {
      return null;
    }
    const pattern =
      prefix === undefined ? this.pattern : this.pattern.withPrefix(prefix);
    return pattern.match(data);
  }

  withPrefix(prefix: string): CallbackRoutePredicate {
    return new CallbackRoutePredicate(this.pattern.withPrefix(prefix));
  }
}

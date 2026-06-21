import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import {
  RegexMatchSource,
  RouteParamSource,
  RoutePredicate,
} from './route-predicate';
import { execPattern, matchesPattern, toStatelessPattern } from './pattern';

/**
 * Matches a callback query by its `data` (the `@Action` predicate):
 *   - no data  -> any callback query
 *   - string   -> exact match
 *   - RegExp   -> `pattern.test(data)`
 *
 * A regex pattern also exposes its captures: the whole `RegExpMatchArray` to
 * `@Matches()` and any named groups to `@Param()`.
 *
 * Reads the raw `callback_query.data` off the update, so it needs no rich-event
 * import (which would pull `events` -> `decorators` into a cycle).
 */
export class ActionPredicate
  implements RoutePredicate, RegexMatchSource, RouteParamSource
{
  private readonly data?: string | RegExp;

  constructor(data?: string | RegExp) {
    this.data = data === undefined ? undefined : toStatelessPattern(data);
  }

  matches(ctx: TelegramExecutionContext): boolean {
    if (this.data === undefined) {
      return true;
    }

    const data = ctx.update.callback_query?.data;
    if (data === undefined) {
      return false;
    }

    return matchesPattern(this.data, data);
  }

  /** The `RegExpMatchArray` a regex pattern captured from the data, for `@Matches()`. */
  extractMatch(ctx: TelegramExecutionContext): RegExpMatchArray | null {
    const data = ctx.update.callback_query?.data;
    if (this.data === undefined || data === undefined) {
      return null;
    }
    return execPattern(this.data, data);
  }

  /** Named regex groups exposed to `@Param()`, mirroring `@Action('done/:id')`. */
  extractParams(ctx: TelegramExecutionContext): Record<string, string> | null {
    return this.extractMatch(ctx)?.groups ?? null;
  }
}

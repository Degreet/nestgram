import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import { RoutePredicate } from './route-predicate';
import { matchesPattern, toStatelessPattern } from './pattern';

/**
 * Matches a callback query by its `data` (the `@Action` predicate):
 *   - no data  -> any callback query
 *   - string   -> exact match
 *   - RegExp   -> `pattern.test(data)`
 *
 * Reads the raw `callback_query.data` off the update, so it needs no rich-event
 * import (which would pull `events` -> `decorators` into a cycle).
 */
export class ActionPredicate implements RoutePredicate {
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
}

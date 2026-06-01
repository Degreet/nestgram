import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import { RoutePredicate } from './route-predicate';
import { matchesPattern, toStatelessPattern } from './pattern';

/**
 * Matches message text (the `@Hears` predicate): a string matches exactly, a
 * RegExp is tested against the text (`@Hears('hi')`, `@Hears(/^\d+$/)`).
 */
export class HearsPredicate implements RoutePredicate {
  private readonly pattern: string | RegExp;

  constructor(pattern: string | RegExp) {
    this.pattern = toStatelessPattern(pattern);
  }

  matches(ctx: TelegramExecutionContext): boolean {
    const text = ctx.update.message?.text;
    if (text === undefined) {
      return false;
    }

    return matchesPattern(this.pattern, text);
  }
}

import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import {
  RegexMatchSource,
  RouteParamSource,
  RoutePredicate,
} from './route-predicate';
import { execPattern, matchesPattern, toStatelessPattern } from './pattern';

/**
 * Matches message text (the `@Hears` predicate): a string matches exactly, a
 * RegExp is tested against the text (`@Hears('hi')`, `@Hears(/^\d+$/)`).
 *
 * A regex pattern also exposes its captures: the whole `RegExpMatchArray` to
 * `@Matches()` and any named groups to `@Param()`.
 */
export class HearsPredicate
  implements RoutePredicate, RegexMatchSource, RouteParamSource
{
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

  /** The `RegExpMatchArray` a regex pattern captured from the text, for `@Matches()`. */
  extractMatch(ctx: TelegramExecutionContext): RegExpMatchArray | null {
    const text = ctx.update.message?.text;
    return text === undefined ? null : execPattern(this.pattern, text);
  }

  /** Named regex groups exposed to `@Param()`, mirroring `@Command('add :amount')`. */
  extractParams(ctx: TelegramExecutionContext): Record<string, string> | null {
    return this.extractMatch(ctx)?.groups ?? null;
  }
}

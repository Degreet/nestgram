import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import { RoutePredicate } from './route-predicate';
import { t } from '../../i18n/translate';

/**
 * Matches a message whose text equals the translation of `key` in the current
 * update's locale — the i18n-aware counterpart of {@link HearsPredicate}, for
 * routing a localized reply-keyboard button by its catalog key instead of a
 * literal string. The locale is resolved before matching runs, so `t()` reads
 * the sender's language.
 */
export class HearsKeyPredicate implements RoutePredicate {
  constructor(private readonly key: string) {}

  matches(ctx: TelegramExecutionContext): boolean {
    const text = ctx.update.message?.text;
    return text !== undefined && text === t(this.key);
  }
}

import { ActionPredicate, RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'callback_query';

const isPredicate = (value: unknown): value is RoutePredicate =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RoutePredicate).matches === 'function';

/**
 * Handle a callback query (inline-button press). `@Action()` matches any;
 * `@Action('buy')` matches `data === 'buy'`; `@Action(/^buy:(\d+)$/)` tests the
 * regex against `callback_query.data`. Pass a `RoutePredicate` for richer
 * matching — most often `callbackData(...).filter()` for typed data
 * (`@Action(Buy.filter())`). Extra predicates narrow further.
 *
 * The doc-facing name for callback handling; `@OnCallbackQuery` is the generic
 * equivalent.
 */
export const Action = (
  data?: string | RegExp | RoutePredicate,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  const matchers = isPredicate(data)
    ? [data, ...predicates]
    : [new ActionPredicate(data), ...predicates];

  return createListenerDecorator(UPDATE_TYPE, ...matchers);
};

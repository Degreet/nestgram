import { ActionPredicate, RoutePredicate } from '../../matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'callback_query';

/**
 * Handle a callback query (inline-button press). `@Action()` matches any;
 * `@Action('buy')` matches `data === 'buy'`; `@Action(/^buy:(\d+)$/)` tests the
 * regex against `callback_query.data`. Extra predicates narrow further.
 *
 * The doc-facing name for callback handling; `@OnCallbackQuery` is the generic
 * equivalent.
 */
export const Action = (
  data?: string | RegExp,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(
    UPDATE_TYPE,
    new ActionPredicate(data),
    ...predicates,
  );
};

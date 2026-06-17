import { ActionPredicate, RoutePredicate } from '../../engine/matching';
import {
  CallbackRoutePattern,
  CallbackRoutePredicate,
} from '../../callback-data';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'callback_query';

const isPredicate = (value: unknown): value is RoutePredicate =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RoutePredicate).matches === 'function';

/**
 * Handle a callback query (inline-button press). `@Action()` matches any;
 * `@Action('done/:id')` is a route template (`/` divides segments, a leading
 * `:` marks a parameter read with `@Param`), so `@Action('buy')` still matches
 * `data === 'buy'` exactly. `@Action(/^buy:(\d+)$/)` tests the regex; pass a
 * custom `RoutePredicate` for richer matching. Extra predicates narrow further.
 *
 * A string route is namespaced by the router's `@Router('ns')` prefix; the
 * regex and predicate forms manage their own data unchanged.
 *
 * The doc-facing name for callback handling; `@OnCallbackQuery` is the generic
 * equivalent.
 */
export const Action = (
  data?: string | RegExp | RoutePredicate,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  const matcher: RoutePredicate = isPredicate(data)
    ? data
    : typeof data === 'string'
    ? new CallbackRoutePredicate(CallbackRoutePattern.compile(data))
    : new ActionPredicate(data);

  return createListenerDecorator(UPDATE_TYPE, matcher, ...predicates);
};

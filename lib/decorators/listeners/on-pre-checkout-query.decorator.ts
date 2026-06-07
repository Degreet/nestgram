import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'pre_checkout_query';

/**
 * Routes `pre_checkout_query` updates to the handler, whose first parameter
 * is the rich {@link PreCheckoutQuery}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnPreCheckoutQuery = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

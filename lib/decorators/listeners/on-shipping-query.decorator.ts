import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'shipping_query';

/**
 * Routes `shipping_query` updates to the handler, whose first parameter
 * is the rich {@link ShippingQuery}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnShippingQuery = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

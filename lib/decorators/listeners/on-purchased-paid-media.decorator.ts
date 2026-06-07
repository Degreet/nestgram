import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'purchased_paid_media';

/**
 * Routes `purchased_paid_media` updates to the handler, whose first parameter
 * is the rich {@link PaidMediaPurchased}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnPurchasedPaidMedia = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

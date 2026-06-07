import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'deleted_business_messages';

/**
 * Routes `deleted_business_messages` updates (messages deleted in a business chat) to the handler, whose first parameter
 * is the rich {@link BusinessMessagesDeleted}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnDeletedBusinessMessage = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

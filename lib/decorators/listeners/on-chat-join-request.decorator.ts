import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chat_join_request';

/**
 * Routes `chat_join_request` updates to the handler, whose first parameter
 * is the rich {@link ChatJoinRequest}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnChatJoinRequest = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

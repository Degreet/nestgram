import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'removed_chat_boost';

/**
 * Routes `removed_chat_boost` updates (a boost was removed) to the handler, whose first parameter
 * is the rich {@link ChatBoostRemoved}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnRemovedChatBoost = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

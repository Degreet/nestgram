import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chat_boost';

/**
 * Routes `chat_boost` updates (a chat was boosted) to the handler, whose first parameter
 * is the rich {@link ChatBoostUpdated}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnChatBoost = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

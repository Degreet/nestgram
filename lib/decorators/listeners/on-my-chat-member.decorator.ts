import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'my_chat_member';

/**
 * Routes `my_chat_member` updates (the bot's own membership changed) to the handler, whose first parameter
 * is the rich {@link ChatMemberUpdated}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnMyChatMember = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

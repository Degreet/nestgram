import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chat_member';

/**
 * Routes `chat_member` updates (a member's status changed in a chat the bot is in) to the handler, whose first parameter
 * is the rich {@link ChatMemberUpdated}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnChatMember = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

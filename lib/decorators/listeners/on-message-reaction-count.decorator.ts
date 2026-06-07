import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message_reaction_count';

/**
 * Routes `message_reaction_count` updates (anonymous reaction counts changed) to the handler, whose first parameter
 * is the rich {@link MessageReactionCountUpdated}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnMessageReactionCount = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

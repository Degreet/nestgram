import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message_reaction';

/**
 * Routes `message_reaction` updates (a user changed a message's reaction) to the handler, whose first parameter
 * is the rich {@link MessageReactionUpdated}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnMessageReaction = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

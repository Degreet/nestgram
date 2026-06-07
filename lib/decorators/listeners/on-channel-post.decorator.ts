import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'channel_post';

/**
 * Routes `channel_post` updates (new posts in channels the bot administers) to the handler, whose first parameter
 * is the rich {@link Message}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnChannelPost = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

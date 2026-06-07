import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'edited_channel_post';

/**
 * Routes `edited_channel_post` updates (the edited post) to the handler, whose first parameter
 * is the rich {@link Message}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnEditedChannelPost = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

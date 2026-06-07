import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'poll_answer';

/**
 * Routes `poll_answer` updates to the handler, whose first parameter
 * is the rich {@link PollAnswer}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnPollAnswer = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

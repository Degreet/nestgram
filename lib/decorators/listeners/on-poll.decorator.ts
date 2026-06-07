import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'poll';

/**
 * Routes `poll` updates (poll state changes) to the handler, whose first parameter
 * is the rich {@link Poll}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnPoll = (...predicates: RoutePredicate[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

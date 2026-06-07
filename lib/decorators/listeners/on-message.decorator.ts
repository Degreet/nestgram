import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message';

/**
 * Routes `message` updates to the handler, whose first parameter
 * is the rich {@link Message}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnMessage = (...predicates: RoutePredicate[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

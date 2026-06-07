import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'business_connection';

/**
 * Routes `business_connection` updates (the bot connected to / disconnected from a business account) to the handler, whose first parameter
 * is the rich {@link BusinessConnection}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnBusinessConnection = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'managed_bot';

/**
 * Routes `managed_bot` updates to the handler, whose first parameter is the rich
 * {@link ManagedBotUpdated}. Optional predicates narrow which updates match (all
 * must pass); stacks with other listeners on one method.
 */
export const OnManagedBot = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

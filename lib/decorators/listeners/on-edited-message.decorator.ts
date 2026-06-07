import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'edited_message';

/**
 * Routes `edited_message` updates (the edited version) to the handler, whose first parameter
 * is the rich {@link Message}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnEditedMessage = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chosen_inline_result';

/**
 * Routes `chosen_inline_result` updates to the handler, whose first parameter
 * is the rich {@link ChosenInlineResult}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnChosenInlineResult = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

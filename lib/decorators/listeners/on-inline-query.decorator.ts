import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'inline_query';

/**
 * Routes `inline_query` updates to the handler, whose first parameter
 * is the rich {@link InlineQuery}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnInlineQuery = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

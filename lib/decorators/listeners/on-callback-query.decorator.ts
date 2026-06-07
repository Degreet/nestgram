import { ActionPredicate, RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'callback_query';

/**
 * Routes `callback_query` updates (an inline-button press) to the handler, whose first parameter
 * is the rich {@link CallbackQuery}. Optional predicates narrow which updates
 * match (all must pass); stacks with other listeners on one method.
 */
export const OnCallbackQuery = (
  data?: string | RegExp,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(
    UPDATE_TYPE,
    new ActionPredicate(data),
    ...predicates,
  );
};

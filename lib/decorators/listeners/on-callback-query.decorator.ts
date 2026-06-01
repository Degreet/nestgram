import { ActionPredicate, RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'callback_query';

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

import { RoutePredicate } from '../../matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'removed_chat_boost';

export const OnRemovedChatBoost = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

import { RoutePredicate } from '../../matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message_reaction_count';

export const OnMessageReactionCount = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

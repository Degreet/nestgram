import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'poll';

export const OnPoll = (...predicates: RoutePredicate[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

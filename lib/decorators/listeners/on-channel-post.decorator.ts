import { RoutePredicate } from '../../matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'channel_post';

export const OnChannelPost = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

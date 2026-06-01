import { RoutePredicate } from '../../matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'inline_query';

export const OnInlineQuery = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

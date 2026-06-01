import { RoutePredicate } from '../../matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'deleted_business_message';

export const OnDeletedBusinessMessage = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

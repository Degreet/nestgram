import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chosen_query_result';

export const OnChosenQueryResult = (
  ...filters: NestgramFilter[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

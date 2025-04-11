import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'business_connection';

export const OnBusinessConnection = (
  ...filters: NestgramFilter[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

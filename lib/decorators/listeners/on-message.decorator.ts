import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message';

export const OnMessage = (...filters: NestgramFilter[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

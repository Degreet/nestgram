import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'poll';

export const OnPoll = (...filters: NestgramFilter[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

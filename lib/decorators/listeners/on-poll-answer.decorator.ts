import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'poll_answer';

export const OnPollAnswer = (...filters: NestgramFilter[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

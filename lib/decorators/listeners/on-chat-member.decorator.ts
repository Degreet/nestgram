import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chat_member';

export const OnChatMember = (...filters: NestgramFilter[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

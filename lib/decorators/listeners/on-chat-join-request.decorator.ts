import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chat_join_request';

export const OnChatJoinRequest = (
  ...filters: NestgramFilter[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

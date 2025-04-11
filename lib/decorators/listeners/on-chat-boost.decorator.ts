import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'chat_boost';

export const OnChatBoost = (...filters: NestgramFilter[]): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

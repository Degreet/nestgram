import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message_reaction_count';

export const OnMessageReactionCount = (
  ...filters: NestgramFilter[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

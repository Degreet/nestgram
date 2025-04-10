import { Type } from '@nestjs/common';

import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'callback_query';

export const OnCallbackQuery = (
  data?: string | RegExp,
  ...filters: Type<NestgramFilter>[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...filters);
};

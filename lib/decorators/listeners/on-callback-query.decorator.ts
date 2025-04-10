import { NestgramFilter } from '../../types';
import { createListenerDecorator } from './create-listener-decorator';
import { CallbackQueryDataFilter } from '../../filters/callback-query-data.filter';

const UPDATE_TYPE = 'callback_query';

export const OnCallbackQuery = (
  data?: string | RegExp,
  ...filters: NestgramFilter[]
): MethodDecorator => {
  return createListenerDecorator(
    UPDATE_TYPE,
    new CallbackQueryDataFilter(data),
    ...filters,
  );
};

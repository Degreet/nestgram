import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../context';
import { extractCallbackData } from '../../execution';

/** Injects the `callback_query.data` string. */
export const CallbackData = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractCallbackData(TelegramExecutionContext.of(ctx)),
);

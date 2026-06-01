import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractCallbackData } from '../../engine/execution';

/** Injects the `callback_query.data` string. */
export const CallbackData = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractCallbackData(TelegramExecutionContext.of(ctx)),
);

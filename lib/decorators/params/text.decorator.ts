import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractText } from '../../engine/execution';

/** Injects the message's plain text (`message.text`), if any. */
export const Text = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractText(TelegramExecutionContext.of(ctx)),
);

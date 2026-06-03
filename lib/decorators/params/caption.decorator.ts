import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractCaption } from '../../engine/execution';

/** Injects the message's media caption (`message.caption`), if any. */
export const Caption = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractCaption(TelegramExecutionContext.of(ctx)),
);

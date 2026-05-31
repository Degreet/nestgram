import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../context';
import { extractChat } from '../../execution';

/** Injects the chat the update happened in (absent for inline-only queries). */
export const Chat = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractChat(TelegramExecutionContext.of(ctx)),
);

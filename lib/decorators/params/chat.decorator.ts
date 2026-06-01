import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractChat } from '../../engine/execution';

/** Injects the chat the update happened in (absent for inline-only queries). */
export const Chat = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractChat(TelegramExecutionContext.of(ctx)),
);

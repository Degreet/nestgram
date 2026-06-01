import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractArgs } from '../../engine/execution';

/** Injects the whitespace-split arguments after a command. */
export const Args = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractArgs(TelegramExecutionContext.of(ctx)),
);

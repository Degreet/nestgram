import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractSender } from '../../engine/execution';

/** Injects the `User` who sent the update (absent for e.g. channel posts). */
export const Sender = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractSender(TelegramExecutionContext.of(ctx)),
);

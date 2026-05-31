import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../context';
import { extractSender } from '../../execution';

/** Injects the `User` who sent the update (absent for e.g. channel posts). */
export const Sender = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractSender(TelegramExecutionContext.of(ctx)),
);

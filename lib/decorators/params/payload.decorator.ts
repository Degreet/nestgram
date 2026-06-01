import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractPayload } from '../../engine/execution';

/** Injects the raw text remainder after a command (e.g. a deep-link payload). */
export const Payload = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractPayload(TelegramExecutionContext.of(ctx)),
);

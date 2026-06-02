import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';

/**
 * Injects the per-update state store — write/read your own flags or context
 * across the pipeline (guards, interceptors, handler). Lives for this update
 * only.
 */
export const State = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    TelegramExecutionContext.of(ctx).state,
);

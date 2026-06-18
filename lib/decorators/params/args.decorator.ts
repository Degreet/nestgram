import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractArgs } from '../../engine/execution';

/**
 * Injects a command's raw arguments — the whitespace-split tokens after the
 * command (`/echo a b` → `['a', 'b']`, `/echo` → `[]`).
 *
 * For typed, named arguments prefer a route template: `@Command('add :amount')`
 * with `@Param('amount', ParseIntPipe)` decodes and validates each segment the
 * Nest-native way. Reach for `@Args()` only when you want the unstructured token
 * list.
 */
export const Args = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    extractArgs(TelegramExecutionContext.of(ctx)),
);

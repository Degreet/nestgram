import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractArgs, extractPayload } from '../../engine/execution';
import type { CommandArgsFactory } from '../../command-args';

/**
 * Injects a command's arguments.
 *
 * Bare — `@Args() args: string[]` — gives the whitespace-split tokens after the
 * command. Passed a `commandArgs(...)` definition — `@Args(AddArgs) args:
 * ArgsOf<typeof AddArgs>` — gives the typed, coerced object (the last field is
 * greedy; a bad/missing value throws `CommandArgsError`). Attach a pipe after
 * the schema (`@Args(AddArgs, new ValidationPipe())`) to validate a DTO.
 *
 * The schema rides in Nest's `data` slot, which works because Nest tells a
 * decorator's `data` from its pipes by sniffing for a `transform` method — a
 * `commandArgs(...)` definition exposes `parse`, never `transform`, so it is
 * never mistaken for a pipe.
 */
export const Args = createParamDecorator(
  (schema: CommandArgsFactory | undefined, ctx: ExecutionContext) => {
    const telegramCtx = TelegramExecutionContext.of(ctx);
    return schema
      ? schema.parse(extractPayload(telegramCtx))
      : extractArgs(telegramCtx);
  },
);

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractArgs, extractPayload } from '../../engine/execution';
import { CommandPredicate } from '../../engine/matching';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../metadata.enum';
import type { CommandArgsFactory } from '../../command-args';

/** The args schema declared on the handler's `@Command(..., schema)`, if any. */
function commandSchemaOf(
  ctx: ExecutionContext,
): CommandArgsFactory | undefined {
  const listeners: ListenerOptions[] =
    Reflect.getMetadata(Metadata.LISTENERS, ctx.getHandler()) ?? [];

  for (const listener of listeners) {
    for (const predicate of listener.predicates ?? []) {
      if (predicate instanceof CommandPredicate && predicate.argsSchema) {
        return predicate.argsSchema;
      }
    }
  }

  return undefined;
}

/**
 * Injects a command's arguments.
 *
 * Bare — `@Args() args: string[]` — gives the whitespace-split tokens after the
 * command. With a `commandArgs(...)` schema — either passed here
 * (`@Args(AddArgs)`) or declared once on `@Command('add', AddArgs)` and picked up
 * by a bare `@Args()` — it gives the typed, coerced object (the last field is
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
    const effective = schema ?? commandSchemaOf(ctx);
    return effective
      ? effective.parse(extractPayload(telegramCtx))
      : extractArgs(telegramCtx);
  },
);

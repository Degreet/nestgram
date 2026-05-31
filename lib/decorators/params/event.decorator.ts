import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the rich, typed event (e.g. `Message`, `CallbackQuery`).
 *
 * Backs the positional first handler argument. The framework auto-applies this
 * to param 0 of every handler (so the bot author writes an undecorated typed
 * event), satisfying ECC's all-or-nothing param resolution — see
 * ECC-NOTES.md. The engine invokes handlers as `invoker(event, ctx)`, so
 * the event is at argument index 0.
 */
export const Event = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.getArgByIndex(0),
);

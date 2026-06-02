import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the rich, typed event (e.g. `Message`, `CallbackQuery`).
 *
 * The framework auto-applies this to param 0 of every handler, so you write an
 * undecorated typed first argument (`handle(message: Message)`) and receive the
 * event. The engine invokes handlers as `invoker(event, ctx)`, so the event is
 * at argument index 0.
 */
export const Event = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.getArgByIndex(0),
);

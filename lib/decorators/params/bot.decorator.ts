import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';

/**
 * Injects the {@link BotService} that received the CURRENT update — the bot a
 * reply goes back through. In a multi-bot app each update is handled by the bot
 * whose source delivered it; `@Bot()` hands you that one without naming it:
 *
 * ```ts
 * @OnMessage()
 * handle(message: Message, @Bot() bot: BotService) {
 *   // bot.name tells you which bot; bot.sendMessage(...) targets it
 * }
 * ```
 *
 * To reach a SPECIFIC bot by name (not the current one), inject it with
 * `@InjectBot('name')` instead.
 */
export const Bot = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    TelegramExecutionContext.of(ctx).bot,
);

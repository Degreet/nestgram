import { Inject } from '@nestjs/common';

import { getBotToken } from '../providers';

/**
 * Inject a specific bot's {@link BotService} by name — sugar over
 * `@Inject(getBotToken(name))`:
 *
 * ```ts
 * constructor(@InjectBot('sales') private readonly sales: BotService) {}
 * ```
 *
 * Omit the name for the default bot (the sole bot, or the one configured
 * `default: true`) — equivalent to injecting a bare `BotService`.
 *
 * Resolves the bot DECLARED in `NestgramModule.forRoot({ bots: [...] })` under a
 * static DI token, so the name must be known at compile time. To send through
 * the bot that received the CURRENT update, use the `@Bot()` handler param
 * instead — it carries the per-update bot, no name needed.
 */
export const InjectBot = (
  name?: string,
): ParameterDecorator & PropertyDecorator => Inject(getBotToken(name));

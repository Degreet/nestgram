import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import { RoutePredicate } from './route-predicate';

const COMMAND_PREFIX = '/';
const BOT_USERNAME_SEPARATOR = '@';

/**
 * Matches a bot command in message text (the `@Command` predicate). The command
 * is given without the leading slash (`@Command('start')`) and matches:
 *   `/start`, `/start args`, `/start@BotName`, `/start@BotName args`.
 *
 * Only the first whitespace-delimited token is considered, with an optional
 * `@BotName` suffix stripped — so arguments never affect the match.
 */
export class CommandPredicate implements RoutePredicate {
  constructor(private readonly command: string) {}

  matches(ctx: TelegramExecutionContext): boolean {
    const text = ctx.update.message?.text?.trimStart();
    if (!text || !text.startsWith(COMMAND_PREFIX)) {
      return false;
    }

    const [token] = text.split(/\s+/, 1);
    const [name] = token
      .slice(COMMAND_PREFIX.length)
      .split(BOT_USERNAME_SEPARATOR, 1);
    return name === this.command;
  }
}

import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import type { RouteParamSource, RoutePredicate } from './route-predicate';
import { CommandRoutePattern } from '../../command-args';

/**
 * Matches a bot command against a compiled {@link CommandRoutePattern} (the
 * `@Command` predicate). The pattern's first token is the command name and the
 * rest are argument segments, so a template like `add :amount :note...` matches
 * `/add 5 buy milk` (and `/add@BotName 5 buy milk`) while capturing the
 * parameters — exact-arity, so `@Command('add :amount')` and
 * `@Command('add :amount :note...')` are disjoint handlers.
 *
 * It also exposes those captures to `@Param()` via {@link RouteParamSource}.
 */
export class CommandPredicate implements RoutePredicate, RouteParamSource {
  private static readonly COMMAND_PREFIX = '/';
  private static readonly BOT_USERNAME_SEPARATOR = '@';
  private static readonly WHITESPACE = /\s/;

  constructor(private readonly pattern: CommandRoutePattern) {}

  matches(ctx: TelegramExecutionContext): boolean {
    return this.captures(ctx) !== null;
  }

  /** The parameters this route captured from the message, or `null` if it isn't a match. */
  extractParams(ctx: TelegramExecutionContext): Record<string, string> | null {
    return this.captures(ctx);
  }

  /**
   * Split the message into the command head (`/add`, with an optional `@BotName`
   * suffix) and its argument text, check the name, then match the arguments —
   * `null` unless it is a command for this route whose arguments fit its shape.
   */
  private captures(
    ctx: TelegramExecutionContext,
  ): Record<string, string> | null {
    const text = ctx.update.message?.text?.trimStart();
    if (!text || !text.startsWith(CommandPredicate.COMMAND_PREFIX)) {
      return null;
    }

    const boundary = text.search(CommandPredicate.WHITESPACE);
    const head = boundary === -1 ? text : text.slice(0, boundary);
    const payload = boundary === -1 ? undefined : text.slice(boundary + 1);

    const [name] = head
      .slice(CommandPredicate.COMMAND_PREFIX.length)
      .split(CommandPredicate.BOT_USERNAME_SEPARATOR, 1);
    if (name !== this.pattern.commandName) {
      return null;
    }

    return this.pattern.matchArgs(payload);
  }
}

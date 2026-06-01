import { CommandPredicate, RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message';

/**
 * Handle a bot command. `@Command('start')` matches `/start`, `/start args`,
 * `/start@BotName` and `/start@BotName args`. Extra predicates narrow further.
 *
 * Ordering: a `@Command`/`@Hears` only reliably wins over a catch-all
 * `@OnMessage()` when both are on the SAME router (method-declaration order).
 * Cross-router order is discovery order and not guaranteed.
 */
export const Command = (
  command: string,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  if (!command) {
    throw new Error('@Command requires a non-empty command name');
  }

  return createListenerDecorator(
    UPDATE_TYPE,
    new CommandPredicate(command),
    ...predicates,
  );
};

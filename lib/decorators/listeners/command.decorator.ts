import { CommandPredicate, RoutePredicate } from '../../engine/matching';
import type { CommandArgsFactory } from '../../command-args';
import { NestgramConfigError } from '../../exceptions';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message';

/** A route predicate (`matches`) vs a `commandArgs(...)` schema (`parse`). */
function isRoutePredicate(
  value: RoutePredicate | CommandArgsFactory,
): value is RoutePredicate {
  return typeof (value as RoutePredicate).matches === 'function';
}

/**
 * Handle a bot command. `@Command('start')` matches `/start`, `/start args`,
 * `/start@BotName` and `/start@BotName args`.
 *
 * Pass a `commandArgs(...)` definition to type the arguments once at the command
 * and read them with a bare `@Args()`: `@Command('add', AddArgs)` →
 * `add(msg: Message, @Args() args: ArgsOf<typeof AddArgs>)`. Extra `RoutePredicate`s
 * narrow further; the schema and predicates can be passed in any order.
 *
 * Ordering: a `@Command`/`@Hears` only reliably wins over a catch-all
 * `@OnMessage()` when both are on the SAME router (method-declaration order).
 * Cross-router order is discovery order and not guaranteed.
 */
export const Command = (
  command: string,
  ...rest: Array<RoutePredicate | CommandArgsFactory>
): MethodDecorator => {
  if (!command) {
    throw new NestgramConfigError('@Command requires a non-empty command name');
  }

  const predicates = rest.filter(isRoutePredicate);
  const schemas = rest.filter(
    (value): value is CommandArgsFactory => !isRoutePredicate(value),
  );
  if (schemas.length > 1) {
    throw new NestgramConfigError(
      '@Command accepts at most one commandArgs(...) schema',
    );
  }

  return createListenerDecorator(
    UPDATE_TYPE,
    new CommandPredicate(command, schemas[0]),
    ...predicates,
  );
};

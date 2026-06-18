import { CommandPredicate, RoutePredicate } from '../../engine/matching';
import { CommandRoutePattern } from '../../command-args';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message';

/**
 * Handle a bot command, as a route. The template's first token is the command
 * name; the rest are argument segments — `:param` captures one token, a literal
 * must match, and a trailing `:rest...` captures the remainder of the message:
 *
 * ```ts
 * @Command('add :amount :note...')
 * add(msg: Message, @Param('amount', ParseIntPipe) amount: number, @Param('note') note: string) {}
 * ```
 *
 * Matching is exact-arity, so the message's shape selects the handler: a bare
 * `@Command('add')` matches `/add` with NO arguments, `@Command('add :amount')`
 * matches exactly one, and the two are disjoint. `/add@BotName ...` is matched
 * too. Read a captured segment with `@Param()`; a per-parameter pipe decodes and
 * validates it the Nest-native way (`@Param('amount', ParseIntPipe)`).
 *
 * Extra `RoutePredicate`s narrow further. Ordering: a `@Command`/`@Hears` only
 * reliably wins over a catch-all `@OnMessage()` when both are on the SAME router
 * (method-declaration order); cross-router order is discovery order and not
 * guaranteed.
 */
export const Command = (
  template: string,
  ...predicates: RoutePredicate[]
): MethodDecorator =>
  createListenerDecorator(
    UPDATE_TYPE,
    new CommandPredicate(CommandRoutePattern.compile(template)),
    ...predicates,
  );

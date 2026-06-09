// Imports the generic primitive directly (not via the decorators barrel) to keep
// the dependency edge explicit and cycle-free.
import { Match } from '../decorators/match.decorator';
import { anyState, noState } from './state-filter.predicates';

/**
 * Narrows a handler to fire ONLY while an FSM flow is active (any state). A
 * method-level modifier (built on `@Match`) — it ANDs into every route the
 * method declares, so it composes with `@Command`/`@OnMessage`/… regardless of
 * order:
 *
 * ```ts
 * @Command('cancel')
 * @AnyState()
 * cancel(message: Message, @Fsm() fsm: FsmContext) { await fsm.clear(); }
 * ```
 */
export const AnyState = (): MethodDecorator => Match(anyState);

/**
 * Narrows a handler to fire ONLY while NO FSM flow is active (idle) — e.g. a
 * catch-all that must not steal a wizard step's input. A method-level modifier
 * (built on `@Match`), same composition rules as {@link AnyState}.
 */
export const NoState = (): MethodDecorator => Match(noState);

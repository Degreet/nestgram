// `import type`: keeps `matching` free of a runtime import on `context` (which
// imports `decorators`, which imports `matching`) — type-only edges are erased,
// so no module-load cycle forms.
import type { TelegramExecutionContext } from '../context/telegram-execution-context';

/**
 * A route-match predicate: decides whether a handler applies to an update.
 *
 * This is ROUTING, deliberately distinct from a Nest guard / `CanActivate`:
 * when a predicate returns `false` the dispatcher tries the NEXT route, whereas
 * a guard's `false` rejects the request (`ForbiddenException`). Predicates run
 * during route selection (before the Nest pipeline); guards run inside it.
 *
 * Implement this to add custom matching — the framework's own predicates
 * (`@Command`/`@Action`/`@Hears`) use this same public contract, nothing privileged.
 */
export interface RoutePredicate {
  matches(ctx: TelegramExecutionContext): boolean | Promise<boolean>;
}

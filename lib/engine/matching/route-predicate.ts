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

/**
 * A predicate that a router prefix can namespace. `@Router('ns')` applies its
 * prefix at discovery to every prefixable predicate on the routes it owns — so a
 * callback route `done/:id` becomes `ns/done/:id`. Predicates that don't
 * implement it (a regex `@Action`, a `@Match` guard-like check) are left as-is.
 */
export interface PrefixablePredicate {
  withPrefix(prefix: string): RoutePredicate;
}

/** Whether a predicate opts into router-prefix namespacing (see {@link PrefixablePredicate}). */
export const isPrefixable = (
  predicate: RoutePredicate,
): predicate is RoutePredicate & PrefixablePredicate =>
  typeof (predicate as Partial<PrefixablePredicate>).withPrefix === 'function';

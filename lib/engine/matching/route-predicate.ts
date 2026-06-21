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

/**
 * A predicate that can hand `@Param()` the named segments it captured from the
 * update that matched it — `@Command('add :amount')` from the message text,
 * `@Action('done/:id')` from the callback data. `@Param('amount')` asks each
 * predicate on the matched handler for its captures and reads the named one, so
 * it is never confused by a sibling route the matcher only evaluated.
 *
 * `prefix` is the handler's `@Router('ns')` prefix, re-applied by the predicates
 * that namespace (callback routes); command routes ignore it.
 */
export interface RouteParamSource {
  extractParams(
    ctx: TelegramExecutionContext,
    prefix: string | undefined,
  ): Record<string, string> | null;
}

/** Whether a predicate can expose captured `@Param()` segments (see {@link RouteParamSource}). */
export const isRouteParamSource = (
  predicate: RoutePredicate,
): predicate is RoutePredicate & RouteParamSource =>
  typeof (predicate as Partial<RouteParamSource>).extractParams === 'function';

/**
 * A predicate that captured a `RegExpMatchArray` from the update it matched — a
 * regex `@Hears(/add (\d+)/)` or `@Action(/buy:(\d+)/)`. `@Matches()` asks the
 * matched handler's predicates for it and injects the whole array, so a handler
 * reads positional groups by index (`m[1]`). Named groups `(?<id>…)`
 * additionally surface through `@Param('id')` via {@link RouteParamSource}, just
 * like a `@Command('add :amount')` segment.
 */
export interface RegexMatchSource {
  extractMatch(ctx: TelegramExecutionContext): RegExpMatchArray | null;
}

/** Whether a predicate captured a regex match (see {@link RegexMatchSource}). */
export const isRegexMatchSource = (
  predicate: RoutePredicate,
): predicate is RoutePredicate & RegexMatchSource =>
  typeof (predicate as Partial<RegexMatchSource>).extractMatch === 'function';

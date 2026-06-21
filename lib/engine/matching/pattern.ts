/**
 * Strip `g`/`y` flags from a RegExp so repeated `.test()` calls are stateless.
 *
 * Predicates are built once at boot and reused for every update; a `g`/`y` regex
 * advances `lastIndex` on each `test`, which would make the same pattern match,
 * then miss, then match across successive updates. Done once in the predicate
 * constructor so there is no per-update allocation. Strings pass through.
 */
export function toStatelessPattern(pattern: string | RegExp): string | RegExp {
  if (pattern instanceof RegExp && (pattern.global || pattern.sticky)) {
    return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
  }
  return pattern;
}

/** Match a value against a string (exact) or a (stateless) RegExp. */
export function matchesPattern(
  pattern: string | RegExp,
  value: string,
): boolean {
  return typeof pattern === 'string' ? value === pattern : pattern.test(value);
}

/**
 * Run a pattern for its capture groups: `null` for a string pattern (exact
 * match — nothing to capture) or a RegExp that doesn't match, otherwise the
 * `RegExpMatchArray` (`[0]` the whole match, `[1..]` positional groups,
 * `.groups` the named ones).
 *
 * Separate from {@link matchesPattern} so the hot routing path stays a cheap
 * boolean `.test()` and this allocating `.match()` runs only when a param
 * (`@Matches()` / a named-group `@Param()`) actually reads the captures. Assumes
 * a stateless pattern (callers strip `g`/`y` via {@link toStatelessPattern}), so
 * a non-global `.match()` returns the first match with its groups intact.
 */
export function execPattern(
  pattern: string | RegExp,
  value: string,
): RegExpMatchArray | null {
  return typeof pattern === 'string' ? null : value.match(pattern);
}

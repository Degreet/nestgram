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

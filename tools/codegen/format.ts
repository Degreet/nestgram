/**
 * Formats generated source with the project's own Prettier (resolving any
 * config, falling back to defaults — the project pins prettier 2.8.8 with no
 * rc file). Running it here makes committed output byte-identical to what
 * lint-staged's `prettier --write` would produce, so the freshness `--check`
 * is meaningful and commits never reformat generated files.
 */
import { format, resolveConfig } from 'prettier';

export function formatTs(source: string, filepath: string): string {
  const config = resolveConfig.sync(filepath) ?? {};
  return format(source, { ...config, filepath, parser: 'typescript' });
}

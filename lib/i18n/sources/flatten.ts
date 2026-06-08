/**
 * Flatten a nested catalog object into the flat `key -> template` map the
 * translator uses, dotting nested keys: `{ cart: { empty: 'x' } }` ->
 * `{ 'cart.empty': 'x' }`. Lets a JSON/YAML file group keys naturally while the
 * runtime stays flat. Leaf values are coerced to strings; arrays are treated as
 * a leaf (joined), since a catalog value is a single template.
 */
export function flattenCatalog(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  collect(value, '', out);
  return out;
}

function collect(
  value: unknown,
  prefix: string,
  out: Record<string, string>,
): void {
  if (value === null || typeof value !== 'object') {
    if (prefix) {
      out[prefix] = String(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    if (prefix) {
      out[prefix] = value.map(String).join('\n');
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    collect(child, path, out);
  }
}

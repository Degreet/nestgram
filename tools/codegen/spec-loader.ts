/**
 * Reads the vendored spec from disk (never the network) and validates its shape.
 * The drift tripwire here is reference integrity: every type token, once its
 * `Array of` prefixes are stripped, must be either a known primitive or a
 * defined type. An unknown token throws loudly — so when the upstream spec grows
 * a new primitive spelling or a dangling reference, the generator must be taught
 * about it rather than silently emitting a broken reference.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BotApiSpec, SpecField } from './spec.types';

const SPEC_FILE = join(__dirname, 'spec', 'api.min.json');

const ARRAY_PREFIX = 'Array of ';
const PRIMITIVE_TOKENS: ReadonlySet<string> = new Set([
  'Integer',
  'Float',
  'String',
  'Boolean',
]);

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Expected an object at ${context}`);
  }
  return value as Record<string, unknown>;
}

function validateToken(
  token: string,
  definedTypes: ReadonlySet<string>,
  context: string,
): void {
  const base = token.startsWith(ARRAY_PREFIX)
    ? token.slice(token.lastIndexOf(ARRAY_PREFIX) + ARRAY_PREFIX.length)
    : token;
  if (PRIMITIVE_TOKENS.has(base) || definedTypes.has(base)) {
    return;
  }
  throw new Error(
    `Unknown type token ${JSON.stringify(
      token,
    )} at ${context} — spec drift; teach the generator about it`,
  );
}

function validateFields(
  fields: SpecField[] | undefined,
  definedTypes: ReadonlySet<string>,
  context: string,
): void {
  for (const field of fields ?? []) {
    const record = asRecord(field, `${context}.field`);
    if (!Array.isArray(record.types)) {
      throw new Error(
        `Missing \`types\` array at ${context}.${String(record.name)}`,
      );
    }
    for (const token of record.types) {
      validateToken(
        String(token),
        definedTypes,
        `${context}.${String(record.name)}`,
      );
    }
  }
}

export function loadSpec(): BotApiSpec {
  const parsed = JSON.parse(readFileSync(SPEC_FILE, 'utf8')) as unknown;
  const spec = asRecord(parsed, 'spec');
  if (
    typeof spec.methods !== 'object' ||
    spec.methods === null ||
    typeof spec.types !== 'object' ||
    spec.types === null
  ) {
    throw new Error('Spec is missing its `methods` / `types` maps');
  }

  const definedTypes = new Set(Object.keys(spec.types as object));

  for (const [name, object] of Object.entries(spec.types as object)) {
    const record = asRecord(object, `type ${name}`);
    validateFields(
      record.fields as SpecField[] | undefined,
      definedTypes,
      name,
    );
    for (const subtype of (record.subtypes as string[] | undefined) ?? []) {
      validateToken(subtype, definedTypes, `${name}.subtypes`);
    }
  }

  for (const [name, method] of Object.entries(spec.methods as object)) {
    const record = asRecord(method, `method ${name}`);
    if (!Array.isArray(record.returns)) {
      throw new Error(`Method ${name} is missing its \`returns\` array`);
    }
    for (const token of record.returns) {
      validateToken(String(token), definedTypes, `${name}#return`);
    }
    validateFields(
      record.fields as SpecField[] | undefined,
      definedTypes,
      name,
    );
  }

  return parsed as BotApiSpec;
}

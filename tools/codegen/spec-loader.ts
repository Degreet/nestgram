/**
 * Reads the vendored spec from disk (never the network) and validates its shape.
 * This is the ONLY place that trusts the JSON: everything downstream may assume
 * a `BotApiSpec` whose every name is a usable identifier, whose every doc link
 * is a real Bot API anchor, whose every type token resolves, and whose optional
 * prose is either absent or well-formed.
 *
 * Two tripwires live here. Reference integrity: every type token, once its
 * `Array of` prefixes are stripped, must be a known primitive or a defined type,
 * so a new primitive spelling or a dangling reference must be taught rather than
 * silently emitted broken. And name safety: the spec is a third-party re-scrape
 * of an HTML page whose names become TypeScript declarations in files a CI cron
 * regenerates unattended, so a name that is not a bare identifier is refused
 * before it can reach an emitter.
 *
 * Every failure names its own offender. An unattended run reports only what this
 * file says, so a message that omits the path is a message that costs an hour.
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

/** What may become a TS declaration or property name verbatim. */
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * The only shape a doc link may take. It is emitted verbatim into a JSDoc
 * `@see`, where a `*​/` would close the comment and leave the rest of the string
 * as top-level TypeScript — in files a cron regenerates and then executes.
 * An allowlisted anchor URL, not an escape, because nothing else is ever valid.
 */
const DOC_LINK = /^https:\/\/core\.telegram\.org\/bots\/api#[a-z0-9]+$/;

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Expected an object at ${context}`);
  }
  return value as Record<string, unknown>;
}

function validateIdentifier(value: unknown, context: string): void {
  if (typeof value !== 'string' || !IDENTIFIER.test(value)) {
    throw new Error(
      `${context} is not a usable identifier: ${JSON.stringify(value)} — the ` +
        `generator would emit it verbatim into TypeScript`,
    );
  }
}

function validateDocLink(value: unknown, context: string): void {
  if (typeof value !== 'string' || !DOC_LINK.test(value)) {
    throw new Error(
      `${context} has an unexpected \`href\`: ${JSON.stringify(value)} — ` +
        `expected a https://core.telegram.org/bots/api#anchor link`,
    );
  }
}

/**
 * The declaration's own name, which must both be usable and AGREE with the key
 * it is filed under. The emitters read whichever is closest to hand — the IR
 * lowers types by key but methods by `name` — so validating one and trusting the
 * other leaves a hole exactly the width of the difference.
 */
function validateDeclaredName(value: unknown, key: string, kind: string): void {
  validateIdentifier(value, `${kind} name`);
  if (value !== key) {
    throw new Error(
      `${kind} is filed under '${key}' but calls itself ` +
        `${JSON.stringify(value)} — the spec disagrees with itself`,
    );
  }
}

/**
 * Object and method prose, which the emitters fold into JSDoc. Optional: a class
 * whose docs page has no paragraph before its field table (`EphemeralMessageParameters`)
 * legitimately carries none. Present-but-malformed is the real defect.
 */
function validateDescription(value: unknown, context: string): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.some((line) => typeof line !== 'string')) {
    throw new Error(
      `${context} has a \`description\` that is not an array of strings`,
    );
  }
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
    validateIdentifier(record.name, `${context}: field name`);
    const where = `${context}.${String(record.name)}`;
    if (!Array.isArray(record.types) || record.types.length === 0) {
      throw new Error(`Missing or empty \`types\` array at ${where}`);
    }
    // Field prose is a single string, unlike the object/method line arrays, and
    // `ir.ts` reads it to recover enums, discriminators and file-upload widening.
    if (typeof record.description !== 'string') {
      throw new Error(`${where} has a \`description\` that is not a string`);
    }
    for (const token of record.types) {
      validateToken(String(token), definedTypes, where);
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
    validateDeclaredName(record.name, name, 'type');
    validateDocLink(record.href, `type ${name}`);
    validateDescription(record.description, `type ${name}`);
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
    validateDeclaredName(record.name, name, 'method');
    validateDocLink(record.href, `method ${name}`);
    validateDescription(record.description, `method ${name}`);
    if (!Array.isArray(record.returns) || record.returns.length === 0) {
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

/**
 * Reads the vendored spec from disk (never the network) and validates it
 * against the known discriminators. Any unrecognised field-kind or object-kind
 * throws loudly — that is the spec-drift tripwire: when the upstream spec grows
 * an 8th kind, the generator must be taught about it rather than silently
 * emitting `undefined`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BotApiSpec } from './spec.types';

const SPEC_FILE = join(__dirname, 'spec', 'custom_v2.min.json');

const FIELD_KINDS = new Set([
  'integer',
  'float',
  'string',
  'bool',
  'reference',
  'array',
  'any_of',
]);
const OBJECT_KINDS = new Set(['properties', 'any_of', 'unknown']);

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error(`Expected an object at ${context}`);
  }
  return value as Record<string, unknown>;
}

function validateTypeInfo(node: unknown, context: string): void {
  const info = asRecord(node, context);
  const kind = info.type;
  if (typeof kind !== 'string' || !FIELD_KINDS.has(kind)) {
    throw new Error(
      `Unknown type_info kind ${JSON.stringify(
        kind,
      )} at ${context} — spec drift; teach the generator about it`,
    );
  }
  if (kind === 'integer' && Array.isArray(info.enumeration)) {
    for (const value of info.enumeration) {
      if (typeof value !== 'number') {
        throw new Error(
          `Non-numeric integer enumeration value ${JSON.stringify(
            value,
          )} at ${context}`,
        );
      }
    }
  }
  if (kind === 'array') {
    validateTypeInfo(info.array, `${context}[]`);
  }
  if (kind === 'any_of' && Array.isArray(info.any_of)) {
    info.any_of.forEach((variant, index) =>
      validateTypeInfo(variant, `${context}.any_of[${index}]`),
    );
  }
}

function validateObject(node: unknown): void {
  const object = asRecord(node, 'object');
  const name = typeof object.name === 'string' ? object.name : '<anonymous>';
  const kind = object.type;
  if (typeof kind !== 'string' || !OBJECT_KINDS.has(kind)) {
    throw new Error(
      `Unknown object kind ${JSON.stringify(kind)} for ${name} — spec drift`,
    );
  }
  if (kind === 'properties' && Array.isArray(object.properties)) {
    for (const property of object.properties) {
      const field = asRecord(property, `${name}.property`);
      validateTypeInfo(field.type_info, `${name}.${String(field.name)}`);
    }
  }
  if (kind === 'any_of' && Array.isArray(object.any_of)) {
    object.any_of.forEach((variant, index) =>
      validateTypeInfo(variant, `${name}.any_of[${index}]`),
    );
  }
}

export function loadSpec(): BotApiSpec {
  const parsed = JSON.parse(readFileSync(SPEC_FILE, 'utf8')) as unknown;
  const spec = asRecord(parsed, 'spec');
  if (!Array.isArray(spec.objects) || !Array.isArray(spec.methods)) {
    throw new Error('Spec is missing its `objects` / `methods` arrays');
  }

  spec.objects.forEach(validateObject);
  for (const method of spec.methods) {
    const entry = asRecord(method, 'method');
    const name = String(entry.name);
    const args = Array.isArray(entry.arguments) ? entry.arguments : [];
    for (const argument of args) {
      const argRecord = asRecord(argument, `${name}.argument`);
      validateTypeInfo(
        argRecord.type_info,
        `${name}(${String(argRecord.name)})`,
      );
    }
    validateTypeInfo(entry.return_type, `${name}#return`);
  }

  return parsed as BotApiSpec;
}

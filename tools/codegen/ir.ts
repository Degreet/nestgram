/**
 * The intermediate representation. The raw spec is lowered into this stable,
 * emission-agnostic shape ONCE here — so the emitters consume IR only and never
 * re-read the spec.
 *
 * The PaulSonOfLars source spells types as STRINGS (`'Integer'`,
 * `'Array of MessageEntity'`); `parseTypeString` lowers each token, and a
 * multi-entry `types`/`returns` array becomes a union. Enum/default/discriminator
 * refinements (literal unions, `'photo'` discriminators) are NOT in this source's
 * structured data — they are recovered from `description` prose in a later step;
 * here every such field lowers to its base primitive.
 */
import { BotApiSpec, SpecField, SpecType } from './spec.types';
import { classToFileName, methodToClassName } from './names';
import { overrideFieldType } from './manifest';

/** A resolved type, independent of how it will be written to TS. */
export type IrType =
  | { kind: 'primitive'; ts: string }
  | { kind: 'literalUnion'; literals: string[] }
  | { kind: 'reference'; name: string }
  | { kind: 'array'; element: IrType }
  | { kind: 'union'; variants: IrType[] };

export interface IrField {
  name: string;
  optional: boolean;
  type: IrType;
  description: string;
}

export type IrObject =
  | { name: string; kind: 'interface'; fields: IrField[]; description: string }
  | { name: string; kind: 'alias'; type: IrType; description: string }
  | { name: string; kind: 'opaque'; description: string };

export interface IrMethod {
  name: string;
  className: string;
  fileName: string;
  args: IrField[];
  returnType: IrType;
  maybeMultipart: boolean;
  description: string;
  documentationLink: string;
}

export interface Ir {
  objects: IrObject[];
  methods: IrMethod[];
  objectsByName: Map<string, IrObject>;
}

/** Collects every spec-object reference name reachable in a type tree. */
export function collectReferences(type: IrType, into: Set<string>): void {
  switch (type.kind) {
    case 'reference':
      into.add(type.name);
      return;
    case 'array':
      collectReferences(type.element, into);
      return;
    case 'union':
      type.variants.forEach((variant) => collectReferences(variant, into));
      return;
    default:
      return;
  }
}

const ARRAY_PREFIX = 'Array of ';
/** The multipart upload sentinel — a field of this type carries a file. */
const INPUT_FILE = 'InputFile';

/** Lowers a single Bot API type token (e.g. `'Array of PhotoSize'`). */
function parseTypeString(token: string): IrType {
  if (token.startsWith(ARRAY_PREFIX)) {
    return {
      kind: 'array',
      element: parseTypeString(token.slice(ARRAY_PREFIX.length)),
    };
  }
  switch (token) {
    case 'Integer':
    case 'Float':
      return { kind: 'primitive', ts: 'number' };
    case 'String':
      return { kind: 'primitive', ts: 'string' };
    case 'Boolean':
      return { kind: 'primitive', ts: 'boolean' };
    default:
      return { kind: 'reference', name: token };
  }
}

/** Lowers a `types`/`returns` token list; multiple tokens form a union. */
function lowerTypes(tokens: string[]): IrType {
  const variants = tokens.map(parseTypeString);
  return variants.length === 1 ? variants[0] : { kind: 'union', variants };
}

function typeReferencesInputFile(type: IrType): boolean {
  switch (type.kind) {
    case 'reference':
      return type.name === INPUT_FILE;
    case 'array':
      return typeReferencesInputFile(type.element);
    case 'union':
      return type.variants.some(typeReferencesInputFile);
    default:
      return false;
  }
}

function lowerField(owner: string, field: SpecField): IrField {
  return {
    name: field.name,
    optional: !field.required,
    type: overrideFieldType(owner, field.name) ?? lowerTypes(field.types),
    description: field.description,
  };
}

function lowerObject(name: string, object: SpecType): IrObject {
  const description = object.description.join('\n');
  if (object.subtypes && object.subtypes.length > 0) {
    return {
      name,
      kind: 'alias',
      description,
      type: {
        kind: 'union',
        variants: object.subtypes.map((subtype) => ({
          kind: 'reference',
          name: subtype,
        })),
      },
    };
  }
  if (object.fields && object.fields.length > 0) {
    return {
      name,
      kind: 'interface',
      description,
      fields: object.fields.map((field) => lowerField(name, field)),
    };
  }
  return { name, kind: 'opaque', description };
}

const byName = <T extends { name: string }>(a: T, b: T): number =>
  a.name.localeCompare(b.name);

export function buildIr(spec: BotApiSpec): Ir {
  // The source keys objects/methods by name (doc order); sort for output that
  // is deterministic regardless of the source's ordering.
  const objects = Object.entries(spec.types)
    .map(([name, object]) => lowerObject(name, object))
    .sort(byName);
  const objectsByName = new Map(objects.map((object) => [object.name, object]));

  const methods = Object.values(spec.methods)
    .map((method): IrMethod => {
      const className = methodToClassName(method.name);
      const args = (method.fields ?? []).map((field) =>
        lowerField(method.name, field),
      );
      return {
        name: method.name,
        className,
        fileName: classToFileName(className),
        args,
        returnType: lowerTypes(method.returns),
        maybeMultipart: args.some((arg) => typeReferencesInputFile(arg.type)),
        description: method.description.join('\n'),
        documentationLink: method.href,
      };
    })
    .sort(byName);

  return { objects, methods, objectsByName };
}

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
import { enumLiterals, namedTypeFor, overrideFieldType } from './manifest';

/** A resolved type, independent of how it will be written to TS. */
export type IrType =
  | { kind: 'primitive'; ts: string }
  | { kind: 'literalUnion'; literals: string[]; open: boolean }
  | { kind: 'namedType'; name: string }
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

/**
 * Collects every named hand-owned type reachable in a type tree (e.g.
 * `ParseModeValue`) — distinct from spec-object references, since the emitters
 * import them from a different module.
 */
export function collectNamedTypes(type: IrType, into: Set<string>): void {
  switch (type.kind) {
    case 'namedType':
      into.add(type.name);
      return;
    case 'array':
      collectNamedTypes(type.element, into);
      return;
    case 'union':
      type.variants.forEach((variant) => collectNamedTypes(variant, into));
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

const STRING_OR_INPUT_FILE: IrType = {
  kind: 'union',
  variants: [
    { kind: 'primitive', ts: 'string' },
    { kind: 'reference', name: INPUT_FILE },
  ],
};

/**
 * The source spells file-upload object fields as a bare `String` (e.g.
 * `InputSticker.sticker`), losing the `InputFile` alternative. Their description
 * is the reliable signal: an uploadable field always documents the
 * `attach://…` form. Such fields are widened to `string | InputFile`, which also
 * lets `detectMedia` find them. (Direct method-arg files are already typed
 * `InputFile` by the source.)
 */
function isFileUploadField(field: SpecField): boolean {
  return (
    field.types.length === 1 &&
    field.types[0] === 'String' &&
    field.description.includes('attach://')
  );
}

function resolveFieldType(owner: string, field: SpecField): IrType {
  const override = overrideFieldType(owner, field.name);
  if (override) {
    return override;
  }
  const named = namedTypeFor(owner, field.name);
  if (named) {
    return { kind: 'namedType', name: named };
  }
  const enumeration = enumLiterals(owner, field.name);
  if (enumeration) {
    return {
      kind: 'literalUnion',
      literals: [...enumeration.literals],
      open: enumeration.open,
    };
  }
  if (isFileUploadField(field)) {
    return STRING_OR_INPUT_FILE;
  }
  return lowerTypes(field.types);
}

function lowerField(owner: string, field: SpecField): IrField {
  return {
    name: field.name,
    optional: !field.required,
    type: resolveFieldType(owner, field),
    description: field.description,
  };
}

const DISCRIMINATOR = /\b(?:always|must be)\s+(?:one of\s+)?"?([a-z_0-9]+)"?/;

/**
 * A subtype member (`subtype_of` set) carries its union tag in the first field,
 * whose description is uniformly phrased `always "x"` / `must be x`. Recovering
 * the literal restores discriminated-union narrowing the source spells as a bare
 * `String`. Non-discriminated unions (e.g. `MaybeInaccessibleMessage`, keyed on
 * a value not a tag) simply don't match — left as-is.
 */
function applyDiscriminator(fields: IrField[], spec: SpecField[]): void {
  const match = DISCRIMINATOR.exec(spec[0]?.description ?? '');
  if (match) {
    fields[0].type = {
      kind: 'literalUnion',
      literals: [match[1]],
      open: false,
    };
  }
}

function lowerObject(name: string, object: SpecType): IrObject {
  const description = object.description.join('\n');
  if (object.subtypes && object.subtypes.length > 0) {
    // Subtypes are a type-token list exactly like `types`/`returns`: usually all
    // object names, but `RichText` mixes in `'String'` and `'Array of RichText'`,
    // so they must lower through `parseTypeString` (→ `string`, `RawRichText[]`),
    // not a bare reference that would spell `RawArray of RichText`.
    return {
      name,
      kind: 'alias',
      description,
      type: lowerTypes(object.subtypes),
    };
  }
  if (object.fields && object.fields.length > 0) {
    const fields = object.fields.map((field) => lowerField(name, field));
    if (object.subtype_of && object.subtype_of.length > 0) {
      applyDiscriminator(fields, object.fields);
    }
    return { name, kind: 'interface', description, fields };
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

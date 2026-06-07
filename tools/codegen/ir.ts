/**
 * The intermediate representation. The raw spec is lowered into this stable,
 * emission-agnostic shape ONCE here — every quirk (any_of → union, enumeration
 * → string-literal union, bool `default:true` → `true`, discriminator `default`
 * → literal, array nesting, return polymorphism) is resolved in `lowerType`, so
 * the emitters consume IR only and never re-read the spec.
 */
import { BotApiSpec, SpecObject, TypeInfo } from './spec.types';
import { classToFileName, methodToClassName } from './names';

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

/**
 * `literalDefaults` distinguishes object properties (where a string `default`
 * is a discriminator → literal, and a bool `default:true` is an always-True
 * marker → `true`) from method arguments (where `default` is just the API's
 * default VALUE for an optional arg, never a literal type). Enumeration is a
 * genuine constraint and becomes a literal union in both contexts.
 */
interface LowerOptions {
  literalDefaults: boolean;
}

function lowerType(info: TypeInfo, options: LowerOptions): IrType {
  switch (info.type) {
    case 'integer':
    case 'float':
      return { kind: 'primitive', ts: 'number' };
    case 'bool':
      if (options.literalDefaults && info.default === true) {
        return { kind: 'primitive', ts: 'true' };
      }
      return { kind: 'primitive', ts: 'boolean' };
    case 'string':
      if (info.enumeration.length > 0) {
        return { kind: 'literalUnion', literals: info.enumeration };
      }
      if (options.literalDefaults && typeof info.default === 'string') {
        return { kind: 'literalUnion', literals: [info.default] };
      }
      return { kind: 'primitive', ts: 'string' };
    case 'reference':
      return { kind: 'reference', name: info.reference };
    case 'array':
      return { kind: 'array', element: lowerType(info.array, options) };
    case 'any_of':
      return {
        kind: 'union',
        variants: info.any_of.map((variant) => lowerType(variant, options)),
      };
  }
}

const PROPERTY_OPTIONS: LowerOptions = { literalDefaults: true };
const ARGUMENT_OPTIONS: LowerOptions = { literalDefaults: false };

function lowerObject(object: SpecObject): IrObject {
  switch (object.type) {
    case 'properties':
      return {
        name: object.name,
        kind: 'interface',
        description: object.description,
        fields: object.properties.map((property) => ({
          name: property.name,
          optional: !property.required,
          type: lowerType(property.type_info, PROPERTY_OPTIONS),
          description: property.description,
        })),
      };
    case 'any_of':
      return {
        name: object.name,
        kind: 'alias',
        description: object.description,
        type: {
          kind: 'union',
          variants: object.any_of.map((variant) =>
            lowerType(variant, ARGUMENT_OPTIONS),
          ),
        },
      };
    case 'unknown':
      return {
        name: object.name,
        kind: 'opaque',
        description: object.description,
      };
  }
}

export function buildIr(spec: BotApiSpec): Ir {
  const objects = spec.objects.map(lowerObject);
  const objectsByName = new Map(objects.map((object) => [object.name, object]));

  const methods = spec.methods.map((method): IrMethod => {
    const className = methodToClassName(method.name);
    return {
      name: method.name,
      className,
      fileName: classToFileName(className),
      args: (method.arguments ?? []).map((argument) => ({
        name: argument.name,
        optional: !argument.required,
        type: lowerType(argument.type_info, ARGUMENT_OPTIONS),
        description: argument.description,
      })),
      returnType: lowerType(method.return_type, ARGUMENT_OPTIONS),
      maybeMultipart: method.maybe_multipart,
      description: method.description,
      documentationLink: method.documentation_link,
    };
  });

  return { objects, methods, objectsByName };
}

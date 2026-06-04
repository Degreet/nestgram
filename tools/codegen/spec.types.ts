/**
 * The shape of the vendored ark0f `custom_v2` Bot API spec. Mirrors the JSON
 * exactly; the loader validates against these discriminators and throws on any
 * unrecognised kind (spec drift). Not a public API — internal to the generator.
 */

/** A field/argument/return type. Discriminated on `type` (the 7 known kinds). */
export type TypeInfo =
  | {
      type: 'integer';
      enumeration: number[];
      default?: number;
      min?: number;
      max?: number;
    }
  | { type: 'float'; enumeration?: number[]; default?: number }
  | {
      type: 'string';
      enumeration: string[];
      default?: string;
      min_len?: number;
      max_len?: number;
    }
  | { type: 'bool'; default?: boolean }
  | { type: 'reference'; reference: string }
  | { type: 'array'; array: TypeInfo }
  | { type: 'any_of'; any_of: TypeInfo[] };

export interface SpecArgument {
  name: string;
  description: string;
  required: boolean;
  type_info: TypeInfo;
}

export interface SpecMethod {
  name: string;
  description: string;
  arguments?: SpecArgument[];
  return_type: TypeInfo;
  maybe_multipart: boolean;
  documentation_link: string;
}

export interface SpecProperty {
  name: string;
  description: string;
  required: boolean;
  type_info: TypeInfo;
}

interface SpecObjectBase {
  name: string;
  description: string;
  documentation_link: string;
}

/** An object with a fixed set of fields → a TS interface. */
export interface SpecPropertiesObject extends SpecObjectBase {
  type: 'properties';
  properties: SpecProperty[];
}

/** A discriminated union of other objects → a TS union alias. */
export interface SpecAnyOfObject extends SpecObjectBase {
  type: 'any_of';
  any_of: TypeInfo[];
}

/** An opaque/empty placeholder (e.g. `InputFile`, `CallbackGame`). */
export interface SpecUnknownObject extends SpecObjectBase {
  type: 'unknown';
}

export type SpecObject =
  | SpecPropertiesObject
  | SpecAnyOfObject
  | SpecUnknownObject;

export interface BotApiSpec {
  version: { major: number; minor: number; patch: number };
  recent_changes: { year: number; month: number; day: number };
  methods: SpecMethod[];
  objects: SpecObject[];
}

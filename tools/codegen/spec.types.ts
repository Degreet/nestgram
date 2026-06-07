/**
 * The shape of the vendored PaulSonOfLars `api.min.json` Bot API spec. Mirrors
 * the JSON exactly; the loader validates it and throws on anything the type
 * parser can't map (spec drift). Not a public API — internal to the generator.
 *
 * Unlike the previous ark0f format, types here are HUMAN-READABLE STRINGS
 * (`'Integer'`, `'Array of MessageEntity'`; a union is multiple array entries,
 * e.g. `['Integer', 'String']`) rather than structured discriminators, and
 * enum/default constraints live only in `description` prose. `ir.ts` lowers both.
 */

/** A field of a type, or an argument of a method. */
export interface SpecField {
  name: string;
  /** One or more type tokens; multiple entries form a union. */
  types: string[];
  required: boolean;
  description: string;
}

export interface SpecMethod {
  name: string;
  href: string;
  description: string[];
  /** Possible return type tokens; multiple entries form a union. */
  returns: string[];
  /** Absent for parameterless methods. */
  fields?: SpecField[];
}

export interface SpecType {
  name: string;
  href: string;
  description: string[];
  /** Present for concrete objects (→ a TS interface). */
  fields?: SpecField[];
  /** Present for abstract unions (→ a TS union alias of the members). */
  subtypes?: string[];
  /** Parent unions this type belongs to. Not used for emission. */
  subtype_of?: string[];
}

export interface BotApiSpec {
  version: string;
  release_date: string;
  methods: Record<string, SpecMethod>;
  types: Record<string, SpecType>;
}

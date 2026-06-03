import { NestgramConfigError } from '../exceptions/config.exception';

/**
 * Encodes a value to / decodes a value from a single string segment. One home
 * for the Number/String/Boolean conversions shared by the structured-string
 * features (callback data, deep-link data) so they can never drift.
 */
export interface ValueCodec<T> {
  encode(value: T): string;
  decode(raw: string): T;
}

/** A schema field's type, named by its constructor. */
export type CodecSpec =
  | NumberConstructor
  | StringConstructor
  | BooleanConstructor;

/** Encoded forms of a boolean — one byte each. */
const BOOLEAN_TRUE = '1';
const BOOLEAN_FALSE = '0';

/**
 * A segment didn't fit its codec. Branded so a caller can catch exactly this and
 * turn it into a non-match (`null`), rather than swallowing every error.
 */
export class ValueDecodeError extends Error {
  constructor(raw: string, type: string) {
    super(`Encoded segment "${raw}" is not a ${type}`);
    this.name = 'ValueDecodeError';
  }
}

const numberCodec: ValueCodec<unknown> = {
  encode: (value) => String(value),
  decode: (raw) => {
    const value = Number(raw);
    // Accept only a codec's own canonical output: `String(Number(x)) === x`
    // rejects forms `encode` never emits (`0x10`, `1e3`, `007`, ` 5 `), and
    // `isFinite` rejects `Infinity`/`NaN`. Keeps encode/decode an exact pair.
    if (!Number.isFinite(value) || String(value) !== raw) {
      throw new ValueDecodeError(raw, 'number');
    }
    return value;
  },
};

/**
 * Integer codec for charset-restricted formats (deep links). Unlike
 * {@link numberCodec}, it accepts only safe integers — a float's `String(n)`
 * emits `.` and a huge/tiny number emits `e`/`+`, none of which fit the
 * deep-link charset `[A-Za-z0-9_-]` (which has no escape). `encode` fails fast on
 * a non-integer so a broken link is never produced silently.
 */
export const integerCodec: ValueCodec<unknown> = {
  encode: (value) => {
    if (!Number.isSafeInteger(value)) {
      throw new NestgramConfigError(
        `A deep-link number must be a safe integer; got ${String(value)}`,
      );
    }
    return String(value);
  },
  decode: (raw) => {
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || String(value) !== raw) {
      throw new ValueDecodeError(raw, 'integer');
    }
    return value;
  },
};

const stringCodec: ValueCodec<unknown> = {
  encode: (value) => String(value),
  decode: (raw) => raw,
};

export const booleanCodec: ValueCodec<unknown> = {
  encode: (value) => (value ? BOOLEAN_TRUE : BOOLEAN_FALSE),
  decode: (raw) => {
    if (raw !== BOOLEAN_TRUE && raw !== BOOLEAN_FALSE) {
      throw new ValueDecodeError(raw, 'boolean');
    }
    return raw === BOOLEAN_TRUE;
  },
};

/** Map a schema field's constructor to its value codec. */
export function resolveCodec(spec: CodecSpec): ValueCodec<unknown> {
  if (spec === Number) {
    return numberCodec;
  }
  if (spec === String) {
    return stringCodec;
  }
  if (spec === Boolean) {
    return booleanCodec;
  }
  throw new NestgramConfigError(
    'A schema value must be Number, String, or Boolean',
  );
}

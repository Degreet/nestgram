import { CallbackDataCodec, CallbackDataSchema } from './callback-data.types';
import { ESCAPE_CHARACTER, SEGMENT_SEPARATOR } from './callback-data.constants';
import { NestgramConfigError } from '../exceptions/config.exception';

/** Encoded forms of a boolean — one byte each. */
const BOOLEAN_TRUE = '1';
const BOOLEAN_FALSE = '0';

/**
 * A segment didn't fit its codec. Branded so `parse` can catch exactly this and
 * rethrow anything unexpected, rather than swallowing every error. It signals a
 * non-match (the data isn't this definition's) and never escapes the layer.
 */
export class CallbackDecodeError extends Error {
  constructor(raw: string, type: string) {
    super(`Callback data segment "${raw}" is not a ${type}`);
    this.name = 'CallbackDecodeError';
  }
}

const numberCodec: CallbackDataCodec<unknown> = {
  encode: (value) => String(value),
  decode: (raw) => {
    const value = Number(raw);
    // Accept only a codec's own canonical output: `String(Number(x)) === x`
    // rejects spoofed/legacy forms `pack` never emits (`0x10`, `1e3`, `007`,
    // ` 5 `), and `isFinite` rejects `Infinity`/`NaN`. Keeps match and parse
    // honest — `filter()` matches exactly the data `pack` produces.
    if (!Number.isFinite(value) || String(value) !== raw) {
      throw new CallbackDecodeError(raw, 'number');
    }
    return value;
  },
};

const stringCodec: CallbackDataCodec<unknown> = {
  encode: (value) => String(value),
  decode: (raw) => raw,
};

const booleanCodec: CallbackDataCodec<unknown> = {
  encode: (value) => (value ? BOOLEAN_TRUE : BOOLEAN_FALSE),
  decode: (raw) => {
    if (raw !== BOOLEAN_TRUE && raw !== BOOLEAN_FALSE) {
      throw new CallbackDecodeError(raw, 'boolean');
    }
    return raw === BOOLEAN_TRUE;
  },
};

/** Map a schema field's constructor to its codec. */
export function resolveCodec(
  spec: CallbackDataSchema[string],
): CallbackDataCodec<unknown> {
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
    'A callbackData schema value must be Number, String, or Boolean',
  );
}

/** Escape the separator (and the escape char) within a single segment. */
function escapeSegment(segment: string): string {
  let result = '';
  for (const char of segment) {
    if (char === ESCAPE_CHARACTER || char === SEGMENT_SEPARATOR) {
      result += ESCAPE_CHARACTER;
    }
    result += char;
  }
  return result;
}

/** Escape each segment and join them with the separator. */
export function joinSegments(segments: string[]): string {
  return segments.map(escapeSegment).join(SEGMENT_SEPARATOR);
}

/**
 * Split on unescaped separators, unescaping each segment in the same pass. The
 * exact inverse of {@link joinSegments}, so a value containing the separator
 * round-trips intact.
 */
export function splitSegments(data: string): string[] {
  const segments: string[] = [];
  let current = '';
  let escaped = false;

  for (const char of data) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === ESCAPE_CHARACTER) {
      escaped = true;
    } else if (char === SEGMENT_SEPARATOR) {
      segments.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  segments.push(current);
  return segments;
}

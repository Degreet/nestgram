import { ESCAPE_CHARACTER, SEGMENT_SEPARATOR } from './callback-data.constants';

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

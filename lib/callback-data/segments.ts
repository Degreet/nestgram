import { ESCAPE_CHARACTER, SEGMENT_SEPARATOR } from './callback-data.constants';

/** Escape the separator (and the escape char) within a single segment. */
function escapeSegment(segment: string, separator: string): string {
  let result = '';
  for (const char of segment) {
    if (char === ESCAPE_CHARACTER || char === separator) {
      result += ESCAPE_CHARACTER;
    }
    result += char;
  }
  return result;
}

/**
 * Escape each segment and join them with the separator. Defaults to the typed
 * callback-data separator (`:`); the route layer joins with `/`.
 */
export function joinSegments(
  segments: string[],
  separator: string = SEGMENT_SEPARATOR,
): string {
  return segments
    .map((segment) => escapeSegment(segment, separator))
    .join(separator);
}

/**
 * Split on unescaped separators, unescaping each segment in the same pass. The
 * exact inverse of {@link joinSegments}, so a value containing the separator
 * round-trips intact.
 */
export function splitSegments(
  data: string,
  separator: string = SEGMENT_SEPARATOR,
): string[] {
  const segments: string[] = [];
  let current = '';
  let escaped = false;

  for (const char of data) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === ESCAPE_CHARACTER) {
      escaped = true;
    } else if (char === separator) {
      segments.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  segments.push(current);
  return segments;
}

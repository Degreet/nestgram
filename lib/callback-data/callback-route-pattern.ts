import { Logger } from '@nestjs/common';

import { NestgramConfigError } from '../exceptions/config.exception';
import {
  MAX_CALLBACK_DATA_BYTES,
  ROUTE_PARAM_PREFIX,
  ROUTE_SEGMENT_SEPARATOR,
} from './callback-data.constants';
import { joinSegments, splitSegments } from './segments';

/** One compiled segment of a callback route: a fixed literal or a named parameter. */
type RouteSegment = { readonly literal: string } | { readonly param: string };

/**
 * A callback route compiled from a template like `reminder/done/:id`. Segments
 * are split on `/`; a whole segment starting with `:` is a parameter, anything
 * else is a literal (so `menu:open` stays a literal — only a leading `:` marks a
 * parameter, the Express/Nest convention).
 *
 * It is the encode/decode half of callback routing — `build()` produces the
 * wire `callback_data` (escaping `/` and `\` in parameter values, never the
 * structural separators), `match()` is its inverse and captures the parameters.
 * `build()` warns when the assembled data exceeds Telegram's 64-byte limit.
 */
export class CallbackRoutePattern {
  /** A parameter name is a JS-identifier-like token (`:id`, `:userId`). */
  private static readonly PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

  private static readonly logger = new Logger('CallbackRoute');

  private constructor(private readonly segments: readonly RouteSegment[]) {}

  /** Compile a template and build its wire data in one step (for one-off buttons). */
  static build(
    template: string,
    params?: Record<string, string | number>,
  ): string {
    return CallbackRoutePattern.compile(template).build(params);
  }

  /** Compile a route template (`reminder/done/:id`) into a reusable pattern. */
  static compile(template: string): CallbackRoutePattern {
    const seen = new Set<string>();
    const segments = template.split(ROUTE_SEGMENT_SEPARATOR).map((part) => {
      if (part.length === 0) {
        throw new NestgramConfigError(
          `Callback route "${template}" has an empty segment`,
        );
      }
      if (!part.startsWith(ROUTE_PARAM_PREFIX)) {
        return { literal: part };
      }

      const name = part.slice(ROUTE_PARAM_PREFIX.length);
      if (!CallbackRoutePattern.PARAM_NAME.test(name)) {
        throw new NestgramConfigError(
          `Callback route "${template}" has an invalid parameter "${part}"`,
        );
      }
      if (seen.has(name)) {
        throw new NestgramConfigError(
          `Callback route "${template}" repeats the parameter ":${name}"`,
        );
      }
      seen.add(name);
      return { param: name };
    });

    return new CallbackRoutePattern(segments);
  }

  /** The parameter names in declaration order (`reminder/done/:id` → `['id']`). */
  get paramNames(): string[] {
    return this.segments.flatMap((segment) =>
      'param' in segment ? [segment.param] : [],
    );
  }

  /** The route template this pattern was compiled from (`reminder/done/:id`). */
  get source(): string {
    return this.segments
      .map((segment) =>
        'param' in segment
          ? `${ROUTE_PARAM_PREFIX}${segment.param}`
          : segment.literal,
      )
      .join(ROUTE_SEGMENT_SEPARATOR);
  }

  /**
   * A new pattern with `prefix` prepended — how `@Router('ns')` namespaces
   * routes. Recompiles the joined template so the merge is validated too (an
   * empty or duplicated parameter across the seam throws, never silently wins).
   */
  withPrefix(prefix: string): CallbackRoutePattern {
    return CallbackRoutePattern.compile(
      `${prefix}${ROUTE_SEGMENT_SEPARATOR}${this.source}`,
    );
  }

  /** Decode `callback_data`; returns the captured parameters, or null if it doesn't match. */
  match(data: string): Record<string, string> | null {
    const parts = splitSegments(data, ROUTE_SEGMENT_SEPARATOR);
    if (parts.length !== this.segments.length) {
      return null;
    }

    const params: Record<string, string> = {};
    for (let index = 0; index < this.segments.length; index++) {
      const segment = this.segments[index];
      if ('param' in segment) {
        params[segment.param] = parts[index];
      } else if (segment.literal !== parts[index]) {
        return null;
      }
    }
    return params;
  }

  /** Build the wire `callback_data`, substituting and escaping each parameter value. */
  build(params: Record<string, string | number> = {}): string {
    const resolved = this.segments.map((segment) => {
      if (!('param' in segment)) {
        return segment.literal;
      }
      const value = params[segment.param];
      if (value === undefined) {
        throw new NestgramConfigError(
          `Callback route "${this.source}" is missing parameter ":${segment.param}"`,
        );
      }
      return String(value);
    });
    const data = joinSegments(resolved, ROUTE_SEGMENT_SEPARATOR);
    this.warnIfTooLong(data);
    return data;
  }

  /** Warn when assembled data exceeds Telegram's 64-byte `callback_data` limit. */
  private warnIfTooLong(data: string): void {
    const bytes = Buffer.byteLength(data, 'utf8');
    if (bytes > MAX_CALLBACK_DATA_BYTES) {
      CallbackRoutePattern.logger.warn(
        `Callback data "${data}" is ${bytes} bytes; Telegram allows at most ` +
          `${MAX_CALLBACK_DATA_BYTES}. The button will be rejected on send — ` +
          `shorten the "${this.source}" route or its values.`,
      );
    }
  }
}

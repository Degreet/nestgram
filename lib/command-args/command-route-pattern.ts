import { NestgramConfigError } from '../exceptions/config.exception';
import {
  COMMAND_PARAM_PREFIX,
  COMMAND_REST_SUFFIX,
  COMMAND_SEGMENT_SEPARATOR,
  COMMAND_TOKEN_JOINER,
} from './command-route.constants';

/** One compiled argument segment: a fixed literal or a (maybe greedy) parameter. */
type CommandSegment =
  | { readonly literal: string }
  | { readonly param: string; readonly rest: boolean };

/**
 * A command route compiled from a template like `add :amount :note...`. The
 * first token is the command name; every token after it is an argument segment.
 * A token starting with `:` is a parameter, anything else is a literal, and a
 * trailing `...` (`:note...`) marks the last parameter as greedy — it captures
 * the rest of the message as one value.
 *
 * Matching is **exact-arity**: a template with N argument segments matches only
 * a payload of exactly N tokens (a greedy last segment absorbs one or more
 * trailing tokens instead). So `@Command('add :amount')` and
 * `@Command('add :amount :note...')` are disjoint — the message's shape selects
 * the handler, the way an HTTP route's path selects a controller method. A bare
 * `add` (no argument segments) therefore matches `/add` with no arguments at
 * all.
 *
 * This is the match half of command routing: {@link commandName} is the cheap
 * pre-check the predicate runs first, {@link matchArgs} captures the parameters
 * from the argument text (or rejects it).
 */
export class CommandRoutePattern {
  /** A parameter name is a JS-identifier-like token (`:id`, `:userId`). */
  private static readonly PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

  private constructor(
    private readonly command: string,
    private readonly segments: readonly CommandSegment[],
  ) {}

  /** Compile a route template (`add :amount :note...`) into a reusable pattern. */
  static compile(template: string): CommandRoutePattern {
    const tokens = template.trim().split(COMMAND_SEGMENT_SEPARATOR);
    const [command, ...rest] = tokens;
    if (!command || command.startsWith(COMMAND_PARAM_PREFIX)) {
      throw new NestgramConfigError(
        `Command route "${template}" must start with a command name`,
      );
    }

    const seen = new Set<string>();
    const segments = rest.map((token, index) =>
      CommandRoutePattern.compileSegment(token, index === rest.length - 1, {
        template,
        seen,
      }),
    );

    return new CommandRoutePattern(command, segments);
  }

  /** The command name this route handles (`add`) — the predicate's first check. */
  get commandName(): string {
    return this.command;
  }

  /** The route template this pattern was compiled from (`add :amount :note...`). */
  get source(): string {
    return [
      this.command,
      ...this.segments.map(CommandRoutePattern.render),
    ].join(COMMAND_TOKEN_JOINER);
  }

  /**
   * Match the argument text (everything after the command name) against this
   * route: returns the captured parameters, or `null` when the payload's shape
   * doesn't fit (wrong token count, or a literal segment mismatched).
   */
  matchArgs(payload: string | undefined): Record<string, string> | null {
    const trimmed = (payload ?? '').trim();
    const tokens = trimmed.length
      ? trimmed.split(COMMAND_SEGMENT_SEPARATOR)
      : [];

    const params: Record<string, string> = {};
    for (let index = 0; index < this.segments.length; index++) {
      const segment = this.segments[index];
      const token = tokens[index];

      if ('literal' in segment) {
        if (token !== segment.literal) {
          return null;
        }
        continue;
      }

      if (segment.rest) {
        // A greedy parameter needs at least one token and swallows the rest, so
        // it is the only segment that may consume more than one token.
        if (index >= tokens.length) {
          return null;
        }
        params[segment.param] = tokens.slice(index).join(COMMAND_TOKEN_JOINER);
        return params;
      }

      if (token === undefined) {
        return null;
      }
      params[segment.param] = token;
    }

    // Exact arity: with no greedy segment, every token must have been consumed.
    return tokens.length === this.segments.length ? params : null;
  }

  private static compileSegment(
    token: string,
    isLast: boolean,
    ctx: { template: string; seen: Set<string> },
  ): CommandSegment {
    if (!token.startsWith(COMMAND_PARAM_PREFIX)) {
      return { literal: token };
    }

    const rest = token.endsWith(COMMAND_REST_SUFFIX);
    if (rest && !isLast) {
      throw new NestgramConfigError(
        `Command route "${ctx.template}" has a greedy parameter "${token}" that ` +
          `is not last`,
      );
    }

    const name = token.slice(
      COMMAND_PARAM_PREFIX.length,
      rest ? -COMMAND_REST_SUFFIX.length : undefined,
    );
    if (!CommandRoutePattern.PARAM_NAME.test(name)) {
      throw new NestgramConfigError(
        `Command route "${ctx.template}" has an invalid parameter "${token}"`,
      );
    }
    if (ctx.seen.has(name)) {
      throw new NestgramConfigError(
        `Command route "${ctx.template}" repeats the parameter ":${name}"`,
      );
    }
    ctx.seen.add(name);
    return { param: name, rest };
  }

  private static render(segment: CommandSegment): string {
    if ('literal' in segment) {
      return segment.literal;
    }
    const suffix = segment.rest ? COMMAND_REST_SUFFIX : '';
    return `${COMMAND_PARAM_PREFIX}${segment.param}${suffix}`;
  }
}

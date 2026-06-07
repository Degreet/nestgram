import {
  CodecSpec,
  resolveCodec,
  ValueCodec,
  ValueDecodeError,
} from '../encoding';
import { NestgramConfigError } from '../exceptions/config.exception';
import { CommandArgsError } from './command-args.error';
import {
  ArgsSchema,
  ArgsValues,
  CommandArgsFactory,
} from './command-args.types';

/** A resolved schema field: its name, how it (de)serializes, and a label for errors. */
interface Field {
  readonly name: string;
  readonly codec: ValueCodec<unknown>;
  readonly label: string;
}

/** Human-readable type name for an error message and the usage signature. */
function labelOf(spec: CodecSpec): string {
  if (spec === Number) {
    return 'number';
  }
  if (spec === Boolean) {
    return 'boolean';
  }
  return 'string';
}

/** Concrete {@link CommandArgsFactory}. Built via {@link commandArgs}, not `new`. */
class TypedCommandArgs<S extends ArgsSchema> implements CommandArgsFactory<S> {
  private readonly fields: ReadonlyArray<Field>;

  constructor(schema: S) {
    this.fields = Object.entries(schema).map(([name, spec]) => ({
      name,
      codec: resolveCodec(spec),
      label: labelOf(spec),
    }));
    if (this.fields.length === 0) {
      throw new NestgramConfigError(
        'commandArgs(schema) requires at least one field',
      );
    }
  }

  parse(payload: string | undefined): ArgsValues<S> {
    const tokens = this.tokenize(payload);
    if (tokens.length < this.fields.length) {
      const missing = this.fields
        .slice(tokens.length)
        .map((field) => field.name)
        .join(', ');
      throw new CommandArgsError(
        `Missing argument(s): ${missing}. Usage: ${this.signature()}.`,
      );
    }

    const values: Record<string, unknown> = {};
    this.fields.forEach((field, index) => {
      values[field.name] = this.decode(field, tokens[index]);
    });
    // Built field-by-field from the schema, so the shape matches the values type.
    return values as ArgsValues<S>;
  }

  /**
   * Split the payload into one token per field. The last field is greedy: it
   * keeps the rest of the text in one piece (`'/add 5 buy milk'` with
   * `{ amount, note }` -> `['5', 'buy milk']`). Returns fewer tokens than fields
   * when the text runs out, which `parse` reports as missing arguments.
   */
  private tokenize(payload: string | undefined): string[] {
    const text = (payload ?? '').trim();
    if (!text) {
      return [];
    }
    if (this.fields.length === 1) {
      return [text];
    }

    const tokens: string[] = [];
    let rest = text;
    for (let i = 0; i < this.fields.length - 1; i++) {
      const split = /^(\S+)\s+([\s\S]+)$/.exec(rest);
      if (!split) {
        tokens.push(rest);
        return tokens;
      }
      tokens.push(split[1]);
      rest = split[2];
    }
    tokens.push(rest);
    return tokens;
  }

  private decode(field: Field, token: string): unknown {
    try {
      return field.codec.decode(token);
    } catch (error) {
      if (error instanceof ValueDecodeError) {
        throw new CommandArgsError(
          `Argument "${field.name}" must be a ${field.label}, got "${token}". ` +
            `Usage: ${this.signature()}.`,
        );
      }
      throw error;
    }
  }

  private signature(): string {
    return this.fields.map((field) => `<${field.name}>`).join(' ');
  }
}

/**
 * Define a command's positional arguments once — then parse the message text
 * into a typed object without hand-written `split`/index/`Number(...)`:
 *
 * ```ts
 * const AddArgs = commandArgs({ amount: Number, note: String });
 *
 * @Command('add')
 * add(message: Message, @Args(AddArgs) args: ArgsOf<typeof AddArgs>) {
 *   // args.amount: number, args.note: string (greedy — keeps trailing text)
 * }
 * ```
 *
 * The last field is greedy. A missing argument or a token that doesn't fit its
 * type throws a {@link CommandArgsError}, which a handler's exception filter can
 * catch to reply with usage help.
 */
export function commandArgs<S extends ArgsSchema>(
  schema: S,
): CommandArgsFactory<S> {
  return new TypedCommandArgs<S>(schema);
}

/** The typed value object of a `commandArgs(...)` definition. */
export type ArgsOf<F> = F extends CommandArgsFactory<infer S>
  ? ArgsValues<S>
  : never;

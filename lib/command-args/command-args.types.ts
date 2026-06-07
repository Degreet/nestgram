import type { SchemaValues, ValueSchema } from '../encoding';

/**
 * The schema passed to `commandArgs(schema)`: each field names a positional
 * argument and its type via the constructor (`Number`/`String`/`Boolean`).
 * Field order is the argument order (object insertion order); the last field is
 * greedy — it consumes the remainder of the message, so trailing free text
 * stays intact.
 */
export type ArgsSchema = ValueSchema;

/** The typed value object a schema produces — what `@Args(schema)` injects. */
export type ArgsValues<S extends ArgsSchema> = SchemaValues<S>;

/**
 * A typed command-arguments definition — one place that declares a command's
 * positional arguments and parses the message text into a typed object, so there
 * is no hand-written `split`/index/`Number(...)` to drift apart. Created by
 * {@link commandArgs}.
 */
export interface CommandArgsFactory<S extends ArgsSchema = ArgsSchema> {
  /** Parse a command's payload (text after the command) into typed values. */
  parse(payload: string | undefined): ArgsValues<S>;
}

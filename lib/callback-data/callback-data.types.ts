import type { RoutePredicate } from '../engine/matching';
import type { SchemaValues, ValueCodec, ValueSchema } from '../encoding';

/**
 * Encodes a value to / decodes a value from one callback-data segment. Alias of
 * the shared {@link ValueCodec}; kept as a named export for the public surface.
 */
export type CallbackDataCodec<T> = ValueCodec<T>;

/**
 * The schema passed to `callbackData(prefix, schema)`: each field names a value
 * and how it (de)serializes, via its constructor (`Number`/`String`/`Boolean`).
 * Field order is the encoding order (object insertion order).
 */
export type CallbackDataSchema = ValueSchema;

/** The typed value object for a schema — what `pack` takes and `parse`/`@Data` give. */
export type CallbackDataValues<S extends CallbackDataSchema> = SchemaValues<S>;

/**
 * A typed callback-data definition — one place that builds, matches and parses a
 * `callback_data` string, so there is no literal separator, hand-written regex
 * or positional `split` to drift apart. Created by {@link callbackData}.
 */
export interface CallbackDataFactory<
  S extends CallbackDataSchema = CallbackDataSchema,
> {
  /** The literal prefix that identifies this definition's data. */
  readonly prefix: string;

  /** Encode values into a `callback_data` string for a button. */
  pack(
    ...args: keyof S extends never ? [] : [values: CallbackDataValues<S>]
  ): string;

  /** Decode a `callback_data` string, or `null` if it isn't this definition's. */
  parse(data: string): CallbackDataValues<S> | null;

  /** A `RoutePredicate` for `@Action(...)` matching this definition's data. */
  filter(): RoutePredicate;
}

/**
 * The minimal contract {@link CallbackDataPredicate} depends on: decode the data
 * or reject it. Decouples the predicate from the concrete factory so the engine
 * never imports the callback-data feature at runtime (no module cycle).
 */
export interface CallbackDataDecoder {
  parse(data: string): object | null;
}

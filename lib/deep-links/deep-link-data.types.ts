/**
 * The schema passed to `deepLinkData(prefix, schema)`. `Number`/`Boolean` only:
 * their encoded forms (`[0-9-]`, `0`/`1`) never contain the `_` separator, so a
 * deep-link param stays collision-free with no escaping. `String` is excluded —
 * it could contain `_` or characters outside the deep-link charset.
 *
 * `Number` fields must be **safe integers**: a float's `String(n)` emits `.` and
 * a huge/tiny value emits `e`/`+`, none of which fit the deep-link charset, so
 * `pack` rejects a non-integer rather than build a broken link.
 */
export type DeepLinkDataSchema = Record<
  string,
  NumberConstructor | BooleanConstructor
>;

/** The typed value object for a schema — what `pack` takes and `parse` gives. */
export type DeepLinkDataValues<S extends DeepLinkDataSchema> = {
  [K in keyof S]: S[K] extends NumberConstructor
    ? number
    : S[K] extends BooleanConstructor
    ? boolean
    : never;
};

/**
 * A typed deep-link-data definition — one place that builds and parses a
 * `/start` deep-link payload, so the same definition packs the link and decodes
 * the update with no magic string on either end. Created by {@link deepLinkData}.
 */
export interface DeepLinkData<
  S extends DeepLinkDataSchema = DeepLinkDataSchema,
> {
  /** The literal prefix that identifies this definition's payload. */
  readonly prefix: string;

  /** Encode values into a deep-link-safe `start` parameter. */
  pack(
    ...args: keyof S extends never ? [] : [values: DeepLinkDataValues<S>]
  ): string;

  /** Decode a `start` payload, or `null` if it isn't this definition's. */
  parse(data: string): DeepLinkDataValues<S> | null;
}

/**
 * The minimal contract `@StartPayload` depends on: decode the payload or reject
 * it. Decouples the decorator from the concrete factory (and its generic).
 */
export interface DeepLinkDataDecoder {
  parse(data: string): object | null;
}

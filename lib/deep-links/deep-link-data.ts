import type { RoutePredicate } from '../engine/matching';
import {
  booleanCodec,
  integerCodec,
  ValueCodec,
  ValueDecodeError,
} from '../encoding';
import {
  DATA_SEGMENT_SEPARATOR,
  VALID_DATA_PREFIX,
} from './deep-link-data.constants';
import {
  DeepLinkData,
  DeepLinkDataSchema,
  DeepLinkDataValues,
} from './deep-link-data.types';
import { DeepLinkDataPredicate } from './deep-link-data.predicate';
import { NestgramConfigError } from '../exceptions/config.exception';

/**
 * Map a deep-link schema field to its codec. Number uses the integer codec
 * (charset-safe, no float `.`/`e`); Boolean uses the shared 1/0 codec.
 */
function resolveCodec(spec: DeepLinkDataSchema[string]): ValueCodec<unknown> {
  if (spec === Number) {
    return integerCodec;
  }
  if (spec === Boolean) {
    return booleanCodec;
  }
  throw new NestgramConfigError(
    'A deepLinkData schema value must be Number or Boolean',
  );
}

/** Concrete {@link DeepLinkData}. Built via {@link deepLinkData}, not `new`. */
class TypedDeepLinkData<S extends DeepLinkDataSchema>
  implements DeepLinkData<S>
{
  private readonly fields: ReadonlyArray<[string, ValueCodec<unknown>]>;

  constructor(readonly prefix: string, schema: S) {
    if (!VALID_DATA_PREFIX.test(prefix)) {
      throw new NestgramConfigError(
        'deepLinkData(prefix) must be non-empty and use only A-Za-z0-9- ' +
          '(no "_", which separates fields)',
      );
    }
    this.fields = Object.entries(schema).map(([key, spec]) => [
      key,
      resolveCodec(spec),
    ]);
  }

  // Looser than the interface (always-optional value) so the class satisfies
  // both the no-field and with-field forms; call sites see the precise interface
  // type, which still requires the values when the schema has fields.
  pack(values?: DeepLinkDataValues<S>): string {
    const fields: Record<string, unknown> = { ...(values ?? {}) };
    return [
      this.prefix,
      ...this.fields.map(([key, codec]) => codec.encode(fields[key])),
    ].join(DATA_SEGMENT_SEPARATOR);
  }

  parse(data: string): DeepLinkDataValues<S> | null {
    const [head, ...rest] = data.split(DATA_SEGMENT_SEPARATOR);
    if (head !== this.prefix || rest.length !== this.fields.length) {
      return null;
    }

    const values: Record<string, unknown> = {};
    try {
      this.fields.forEach(([key, codec], index) => {
        values[key] = codec.decode(rest[index]);
      });
    } catch (error) {
      if (error instanceof ValueDecodeError) {
        // A segment didn't fit its codec — same prefix/arity, different data.
        return null;
      }
      throw error;
    }

    // Built field-by-field from the schema, so the shape matches the values type.
    return values as DeepLinkDataValues<S>;
  }

  filter(): RoutePredicate {
    return new DeepLinkDataPredicate(this);
  }
}

/**
 * Define a typed `/start` deep-link payload once — then pack it into a link and
 * parse it back from the update with no magic string on either end:
 *
 * ```ts
 * const Ref = deepLinkData('ref', { userId: Number });
 *
 * bot.deepLink({ start: Ref.pack({ userId: 42 }) }); // ?start=ref_42
 *
 * @Command('start')
 * start(@StartPayload(Ref) data: { userId: number } | null) {}
 * ```
 *
 * Omit the schema for a payload-less marker: `deepLinkData('promo').pack()`.
 */
export function deepLinkData<
  S extends DeepLinkDataSchema = Record<never, never>,
>(
  prefix: string,
  // Empty default for a marker with no fields; `{}` genuinely is an `S` then.
  schema: S = {} as S,
): DeepLinkData<S> {
  return new TypedDeepLinkData<S>(prefix, schema);
}

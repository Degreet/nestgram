import { Logger } from '@nestjs/common';

import type { RoutePredicate } from '../engine/matching';
import {
  CallbackDataCodec,
  CallbackDataDecoder,
  CallbackDataFactory,
  CallbackDataSchema,
  CallbackDataValues,
} from './callback-data.types';
import {
  CallbackDecodeError,
  joinSegments,
  resolveCodec,
  splitSegments,
} from './codecs';
import { MAX_CALLBACK_DATA_BYTES } from './callback-data.constants';
import { CallbackDataPredicate } from './callback-data.predicate';
import { NestgramConfigError } from '../exceptions/config.exception';

/** Concrete {@link CallbackDataFactory}. Built via {@link callbackData}, not `new`. */
class TypedCallbackData<S extends CallbackDataSchema>
  implements CallbackDataFactory<S>, CallbackDataDecoder
{
  private readonly logger = new Logger('CallbackData');
  private readonly fields: ReadonlyArray<[string, CallbackDataCodec<unknown>]>;

  constructor(readonly prefix: string, schema: S) {
    if (prefix.trim().length === 0) {
      throw new NestgramConfigError(
        'callbackData(prefix) requires a non-empty prefix',
      );
    }
    this.fields = Object.entries(schema).map(([key, spec]) => [
      key,
      resolveCodec(spec),
    ]);
  }

  // Looser than the interface (always-optional value) so the class satisfies
  // both the no-field and with-field forms; call sites see the precise
  // interface type, which still requires the values when the schema has fields.
  pack(values?: CallbackDataValues<S>): string {
    const fields: Record<string, unknown> = { ...(values ?? {}) };
    const segments = [
      this.prefix,
      ...this.fields.map(([key, codec]) => codec.encode(fields[key])),
    ];

    const data = joinSegments(segments);
    this.warnIfTooLong(data);
    return data;
  }

  parse(data: string): CallbackDataValues<S> | null {
    const [head, ...rest] = splitSegments(data);
    if (head !== this.prefix || rest.length !== this.fields.length) {
      return null;
    }

    const values: Record<string, unknown> = {};
    try {
      this.fields.forEach(([key, codec], index) => {
        values[key] = codec.decode(rest[index]);
      });
    } catch (error) {
      if (error instanceof CallbackDecodeError) {
        // A segment didn't fit its codec — same prefix/arity, different data.
        return null;
      }
      throw error;
    }

    // Built field-by-field from the schema, so the shape matches the values type.
    return values as CallbackDataValues<S>;
  }

  filter(): RoutePredicate {
    return new CallbackDataPredicate(this);
  }

  private warnIfTooLong(data: string): void {
    const bytes = Buffer.byteLength(data, 'utf8');
    if (bytes > MAX_CALLBACK_DATA_BYTES) {
      this.logger.warn(
        `Callback data "${data}" is ${bytes} bytes; Telegram allows at most ` +
          `${MAX_CALLBACK_DATA_BYTES}. The button will be rejected on send — ` +
          `shorten the "${this.prefix}" prefix or its values.`,
      );
    }
  }
}

/**
 * Define typed callback data once — then build, match and parse it without magic
 * strings:
 *
 * ```ts
 * const Buy = callbackData('buy', { productId: Number });
 *
 * new InlineKeyboard().text('Buy', Buy.pack({ productId: 42 })); // build
 *
 * @Action(Buy.filter())                                          // match
 * buy(query: CallbackQuery, @Data() data: { productId: number }) {}
 * ```
 *
 * Omit the schema for a payload-less button: `callbackData('menu').pack()`.
 */
export function callbackData<
  S extends CallbackDataSchema = Record<never, never>,
>(
  prefix: string,
  // Defaults to an empty schema for a payload-less definition; `{}` genuinely is
  // an `S` in that case, so the assertion is the empty-default seam, not a hack.
  schema: S = {} as S,
): CallbackDataFactory<S> {
  return new TypedCallbackData<S>(prefix, schema);
}

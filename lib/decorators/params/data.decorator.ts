import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { CallbackDataPredicate } from '../../callback-data';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../metadata.enum';

/**
 * Injects the typed values decoded from `callback_query.data` by the
 * `callbackData(...).filter()` this handler matched on. Annotate the parameter
 * with the definition's value type:
 *
 * ```ts
 * @Action(Buy.filter())
 * buy(query: CallbackQuery, @Data() data: { productId: number }) {}
 * ```
 *
 * Decoding happens here, against the definition of the handler that actually
 * ran (read off its own `filter()` predicate) — so it is never confused by a
 * sibling route the matcher only evaluated. Empty when the handler wasn't
 * matched through a `filter()` (e.g. a plain `@Action('buy')` or
 * `@OnCallbackQuery()`); reach for `@CallbackData()` for the raw string there.
 */
export const Data = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const data = TelegramExecutionContext.of(ctx).update.callback_query?.data;
    if (data === undefined) {
      return undefined;
    }

    const listeners: ListenerOptions[] =
      Reflect.getMetadata(Metadata.LISTENERS, ctx.getHandler()) ?? [];

    for (const listener of listeners) {
      for (const predicate of listener.predicates ?? []) {
        if (predicate instanceof CallbackDataPredicate) {
          const decoded = predicate.parse(data);
          if (decoded !== null) {
            return decoded;
          }
        }
      }
    }

    return undefined;
  },
);

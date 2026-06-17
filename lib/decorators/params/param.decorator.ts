import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { CallbackRoutePredicate } from '../../callback-data';
import { getRouterPrefix } from '../injectable/router.decorator';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../metadata.enum';

/**
 * Injects a named segment captured from a callback route. With
 * `@Action('done/:id')`, `@Param('id')` hands you the `id` segment as a string;
 * a per-parameter pipe decodes and validates it the Nest-native way:
 *
 * ```ts
 * @Action('done/:id')
 * done(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {}
 * ```
 *
 * Extraction runs against the route of the handler that actually matched — its
 * own `@Action` template, with the router's `@Router('ns')` prefix re-applied —
 * so it is never confused by a sibling route the matcher only evaluated. Empty
 * when the handler didn't match through a string `@Action` (e.g. a regex or a
 * custom predicate); the parameter has no named segment to read there.
 */
export const Param = createParamDecorator(
  (name: string, ctx: ExecutionContext) => {
    const data = TelegramExecutionContext.of(ctx).update.callback_query?.data;
    if (data === undefined) {
      return undefined;
    }

    const prefix = getRouterPrefix(ctx.getClass());
    const listeners: ListenerOptions[] =
      Reflect.getMetadata(Metadata.LISTENERS, ctx.getHandler()) ?? [];

    for (const listener of listeners) {
      for (const predicate of listener.predicates ?? []) {
        if (!(predicate instanceof CallbackRoutePredicate)) {
          continue;
        }
        const resolved =
          prefix === undefined ? predicate : predicate.withPrefix(prefix);
        const params = resolved.extract(data);
        if (params !== null) {
          return params[name];
        }
      }
    }

    return undefined;
  },
);

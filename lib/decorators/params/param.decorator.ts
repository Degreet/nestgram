import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { isRouteParamSource } from '../../engine/matching';
import { getRouterPrefix } from '../injectable/router.decorator';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../metadata.enum';

/**
 * Injects a named segment captured from a route. With `@Command('add :amount')`,
 * `@Param('amount')` hands you the `amount` token; with `@Action('done/:id')`,
 * `@Param('id')` hands you the `id` segment — a per-parameter pipe decodes and
 * validates it the Nest-native way:
 *
 * ```ts
 * @Command('add :amount')
 * add(message: Message, @Param('amount', ParseIntPipe) amount: number) {}
 * ```
 *
 * Extraction runs against the route of the handler that actually matched — its
 * own `@Command`/`@Action` template, with the router's `@Router('ns')` prefix
 * re-applied for callback routes — so it is never confused by a sibling route
 * the matcher only evaluated. Empty when the handler didn't match through a
 * parameterised route (e.g. a regex `@Action` or a custom predicate); there is
 * no named segment to read there.
 */
export const Param = createParamDecorator(
  (name: string, ctx: ExecutionContext) => {
    const tgCtx = TelegramExecutionContext.of(ctx);
    const prefix = getRouterPrefix(ctx.getClass());
    const listeners: ListenerOptions[] =
      Reflect.getMetadata(Metadata.LISTENERS, ctx.getHandler()) ?? [];

    // The first parameterised route that matched wins — a handler carries at
    // most one capturing route predicate (extra predicates only narrow).
    for (const listener of listeners) {
      for (const predicate of listener.predicates ?? []) {
        if (!isRouteParamSource(predicate)) {
          continue;
        }
        const params = predicate.extractParams(tgCtx, prefix);
        if (params !== null) {
          return params[name];
        }
      }
    }

    return undefined;
  },
);

import { RoutePredicate } from '../../engine/matching';
import { Command } from './command.decorator';

const START_COMMAND = 'start';

/**
 * Handle the `/start` command — sugar for `@Command('start ...')`. With no route
 * it matches a bare `/start` (no payload, the welcome screen); pass a payload
 * route to handle a deep link (`t.me/bot?start=ref_42`):
 *
 * ```ts
 * @OnStart()                // /start, no payload
 * @OnStart('ref_:code')     // /start ref_42 → @Param('code') === '42'
 * @OnStart('info')          // /start info
 * ```
 *
 * Routes are exact-arity and disjoint, so the payload selects the handler — a
 * bare `@OnStart()` never swallows a `/start` that carries a deep link. Extra
 * predicates narrow further.
 */
export const OnStart = (
  route?: string,
  ...predicates: RoutePredicate[]
): MethodDecorator =>
  Command(route ? `${START_COMMAND} ${route}` : START_COMMAND, ...predicates);

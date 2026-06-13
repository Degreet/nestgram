import { createParamDecorator } from '@nestjs/common';

import { getAmbient } from '../../ambient';
import { SESSION } from '../../sessions/session.constants';

/**
 * Injects the per-update session object — loaded by `SessionService` before the
 * handler runs (when `session` is configured on the module) and persisted after
 * the handler succeeds. Mutate it in place:
 *
 * ```ts
 * @Command('add')
 * add(message: Message, @Session() cart: Cart) {
 *   cart.items.push(42); // saved after the handler
 * }
 * ```
 *
 * Resolves to `undefined` when sessions aren't configured.
 */
export const Session = createParamDecorator((_data: unknown) =>
  getAmbient(SESSION),
);

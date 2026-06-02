import { createParamDecorator } from '@nestjs/common';

/**
 * Injects the session object.
 *
 * A stub for a future session store — not backed by a store yet, so it resolves
 * to `undefined`. Declared now so handler signatures and docs stay stable.
 */
export const Session = createParamDecorator(() => undefined);

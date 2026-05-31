import { createParamDecorator } from '@nestjs/common';

/**
 * Injects the session object.
 *
 * Stub in Phase 1: there is no backing store yet, so it resolves to `undefined`
 * (Q-SESSION — wired in Phase 2). Declared now so handler signatures and docs
 * stay stable across the cutover.
 */
export const Session = createParamDecorator(() => undefined);

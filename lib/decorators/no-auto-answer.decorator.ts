import { SetMetadata } from '@nestjs/common';

import { Metadata } from './metadata.enum';

/**
 * Opt a callback handler out of auto-answering. When the global auto-answer is
 * on, the framework calls `query.answer()` for handlers that didn't — mark a
 * handler with `@NoAutoAnswer()` to take full control of when (or whether) the
 * callback query is answered.
 */
export const NoAutoAnswer = (): MethodDecorator =>
  SetMetadata(Metadata.NO_AUTO_ANSWER, true);

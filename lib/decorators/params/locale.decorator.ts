import { createParamDecorator } from '@nestjs/common';

import { locale } from '../../i18n';

/**
 * Injects the current update's resolved locale (sugar over the free
 * {@link locale} helper). Resolves to `undefined` when i18n isn't configured.
 *
 * ```ts
 * @Command('start')
 * start(message: Message, @Locale() lang: string) {
 *   return t('welcome');
 * }
 * ```
 */
export const Locale = createParamDecorator((_data: unknown) => locale());

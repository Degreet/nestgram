import { getAmbient } from '../ambient';
import { LOCALE, TRANSLATE } from './i18n.constants';
import type { Translate, TranslateImpl, TranslateParams } from './i18n.types';

/**
 * Translate a key into the current update's locale. A free function — reachable
 * anywhere in the update's call chain via the ambient context, never an injected
 * parameter (the framework's i18n bargain).
 *
 * Pass a locale string to translate into an explicit locale instead of the
 * ambient one (`t(key, 'uk')`, `t(key, params, 'uk')`) — useful when one handler
 * renders text in more than one language. The second argument is read as params
 * when it's an object, as a locale when it's a string.
 *
 * A door onto `I18nService.t`, which seeds itself here per update — not a second
 * implementation. So outside an update there is nothing on the rail and this
 * returns the key, even for an explicit locale; inject `I18nService` and call
 * `i18n.t(key, 'uk')` when there is no update in flight.
 *
 * Degrades gracefully: with i18n unconfigured, outside an update, or for an
 * unknown key, it returns the key itself — visible, never throwing.
 */
export const t: Translate = (
  key: string,
  paramsOrLocale?: TranslateParams | string,
  explicitLocale?: string,
): string =>
  getAmbient<TranslateImpl>(TRANSLATE)?.(key, paramsOrLocale, explicitLocale) ??
  key;

/** The current update's resolved locale, or `undefined` when i18n is off. */
export function locale(): string | undefined {
  return getAmbient<string>(LOCALE);
}

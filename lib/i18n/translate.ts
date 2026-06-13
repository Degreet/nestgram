import { getAmbient } from '../ambient';
import { LOCALE, TRANSLATOR, TRANSLATOR_FACTORY } from './i18n.constants';
import type {
  Translate,
  TranslateFn,
  TranslateParams,
  TranslatorFactory,
} from './i18n.types';

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Interpolate `{name}` placeholders in a template. An unmatched placeholder is
 * left as-is, so a typo is visible rather than silently blanked. Pure — shared
 * by the locale-bound translators `I18nService` builds.
 */
export function interpolate(
  template: string,
  params?: TranslateParams,
): string {
  if (!params) {
    return template;
  }
  // `Object.hasOwn`, not `in`: a `{toString}` placeholder must stay visible, not
  // pull an inherited Object.prototype method.
  return template.replace(PLACEHOLDER, (whole, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : whole,
  );
}

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
 * Degrades gracefully: with i18n unconfigured, outside an update, or for an
 * unknown key, it returns the key itself — visible, never throwing.
 */
export const t: Translate = (
  key: string,
  paramsOrLocale?: TranslateParams | string,
  explicitLocale?: string,
): string => {
  const params =
    typeof paramsOrLocale === 'object' ? paramsOrLocale : undefined;
  const locale =
    typeof paramsOrLocale === 'string' ? paramsOrLocale : explicitLocale;

  const translator =
    locale === undefined
      ? getAmbient<TranslateFn>(TRANSLATOR)
      : getAmbient<TranslatorFactory>(TRANSLATOR_FACTORY)?.(locale);

  return translator ? translator(key, params) : key;
};

/** The current update's resolved locale, or `undefined` when i18n is off. */
export function locale(): string | undefined {
  return getAmbient<string>(LOCALE);
}

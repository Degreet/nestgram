import { getAmbient } from '../ambient';
import { LOCALE, TRANSLATOR } from './i18n.constants';
import type { TranslateFn, TranslateParams } from './i18n.types';

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Interpolate `{name}` placeholders in a template. An unmatched placeholder is
 * left as-is, so a typo is visible rather than silently blanked. Pure — shared
 * by the locale-bound translators `I18nManager` builds.
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
 * Degrades gracefully: with i18n unconfigured, outside an update, or for an
 * unknown key, it returns the key itself — visible, never throwing.
 */
export const t: TranslateFn = (key, params) => {
  const translator = getAmbient<TranslateFn>(TRANSLATOR);
  return translator ? translator(key, params) : key;
};

/** The current update's resolved locale, or `undefined` when i18n is off. */
export function locale(): string | undefined {
  return getAmbient<string>(LOCALE);
}

import type { TranslateParams } from '../i18n.types';

/**
 * The seam that decouples the translator from the message format. The default
 * backend ({@link FlatTranslatorBackend}) renders flat `key -> template` strings
 * with `{param}` interpolation; a Fluent backend renders `.ftl` messages with
 * runtime selectors/plurals. `I18nManager` layers locale fallback, missing-key
 * logging and the key-as-last-resort on top, so a backend only has to answer
 * "format this key in this one locale, or say you don't have it".
 *
 * A custom backend (ICU MessageFormat, gettext, a remote service) is a
 * two-method class — no privileged core.
 */
export interface TranslatorBackend {
  /** Whether this backend has a catalog for the locale (drives locale resolution). */
  hasLocale(locale: string): boolean;
  /**
   * Render `key` in `locale`, or `undefined` when the key isn't in that locale's
   * catalog (so the manager can fall back to the fallback locale, then the key).
   */
  format(
    locale: string,
    key: string,
    params?: TranslateParams,
  ): string | undefined;
}

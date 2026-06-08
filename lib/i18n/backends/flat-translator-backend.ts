import { interpolate } from '../translate';
import type { TranslateParams, Translations } from '../i18n.types';
import type { TranslatorBackend } from './translator-backend';

/**
 * The default backend: flat `key -> template` catalogs with `{param}`
 * interpolation. Wraps the {@link Translations} that `translations` / a
 * `TranslationSource` produce — what most bots use.
 */
export class FlatTranslatorBackend implements TranslatorBackend {
  constructor(private readonly translations: Translations) {}

  hasLocale(locale: string): boolean {
    return Object.hasOwn(this.translations, locale);
  }

  format(
    locale: string,
    key: string,
    params?: TranslateParams,
  ): string | undefined {
    const catalog = this.translations[locale];
    // `Object.hasOwn`, not `catalog[key]`: a key like 'toString' must not pull an
    // inherited Object.prototype member and get fed to `interpolate`.
    if (!catalog || !Object.hasOwn(catalog, key)) {
      return undefined;
    }
    return interpolate(catalog[key], params);
  }
}

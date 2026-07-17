import type { TranslateParams, Translations } from '../i18n.types';
import type { TranslatorBackend } from './translator-backend';

/**
 * The default backend: flat `key -> template` catalogs with `{param}`
 * interpolation. Wraps the {@link Translations} that `translations` / a
 * `TranslationSource` produce — what most bots use.
 *
 * It is the only backend that interpolates: a richer format (Fluent, ICU)
 * renders placeholders itself, so `format` hands params straight to it.
 */
export class FlatTranslatorBackend implements TranslatorBackend {
  private static readonly PLACEHOLDER = /\{(\w+)\}/g;

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
    return FlatTranslatorBackend.interpolate(catalog[key], params);
  }

  /**
   * Splice `{name}` placeholders in a template. An unmatched placeholder is left
   * as-is, so a typo is visible rather than silently blanked.
   */
  private static interpolate(
    template: string,
    params?: TranslateParams,
  ): string {
    if (!params) {
      return template;
    }
    // `Object.hasOwn`, not `in`: a `{toString}` placeholder must stay visible, not
    // pull an inherited Object.prototype method.
    return template.replace(this.PLACEHOLDER, (whole, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : whole,
    );
  }
}

import type { TelegramExecutionContext } from '../engine/context';

/** Interpolation values spliced into a message template's `{placeholders}`. */
export type TranslateParams = Record<string, string | number>;

/** Translate a key into the current locale, optionally interpolating params. */
export type TranslateFn = (key: string, params?: TranslateParams) => string;

/**
 * Per-locale message catalogs: `locale -> (key -> template)`. Keys are flat
 * strings (dot them for grouping, e.g. `'cart.empty'`); templates interpolate
 * `{name}` placeholders. Plain data, so catalogs can come from JSON, a loader,
 * or be inlined.
 */
export type Translations = Record<string, Record<string, string>>;

/**
 * i18n configuration, passed as `i18n` on the module options. Presence enables
 * translation; omit it to keep it off (then {@link t} returns the key verbatim).
 */
export interface I18nOptions {
  /** Per-locale message catalogs. */
  translations: Translations;
  /** Locale used when an update's locale can't be resolved or is unknown. */
  defaultLocale: string;
  /**
   * Locale to fall back to for a key missing in the resolved locale's catalog.
   * Defaults to {@link defaultLocale}.
   */
  fallbackLocale?: string;
  /**
   * Resolve the locale for an update. Default: the sender's Telegram
   * `language_code` when a catalog exists for it, else {@link defaultLocale}.
   */
  resolveLocale?: (ctx: TelegramExecutionContext) => string | undefined;
}

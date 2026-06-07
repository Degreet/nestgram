import type { TelegramExecutionContext } from '../engine/context';

/** Interpolation values spliced into a message template's `{placeholders}`. */
export type TranslateParams = Record<string, string | number>;

/** A locale-bound translator: a key (+ params) into one fixed locale's text. */
export type TranslateFn = (key: string, params?: TranslateParams) => string;

/** Builds a {@link TranslateFn} for any locale. Seeded into the ambient store per update. */
export type TranslatorFactory = (locale: string) => TranslateFn;

/**
 * The free {@link t} helper. Translates a key into the current update's locale,
 * or into an explicit locale when one is passed (`t(key, 'uk')` /
 * `t(key, params, 'uk')`) — the explicit form still reads the per-update
 * translator factory from the ambient store, so it works anywhere in an update's
 * call chain without DI.
 */
export interface Translate {
  (key: string): string;
  (key: string, params: TranslateParams): string;
  (key: string, locale: string): string;
  (key: string, params: TranslateParams, locale: string): string;
}

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
  /**
   * Warn (once per locale+key) when a key is missing from both the resolved
   * locale and the fallback catalog — a catalog bug surfacing as the raw key in
   * output. Off by default (returning the key is a deliberate, safe fallback).
   */
  logMissingKeys?: boolean;
}

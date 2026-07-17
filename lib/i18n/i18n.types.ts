import type { TelegramExecutionContext } from '../engine/context';
import type { TranslationSource } from './sources/translation-source';
import type { TranslatorBackend } from './backends/translator-backend';

/** Interpolation values spliced into a message template's `{placeholders}`. */
export type TranslateParams = Record<string, string | number>;

/** A locale-bound translator: a key (+ params) into one fixed locale's text. */
export type TranslateFn = (key: string, params?: TranslateParams) => string;

/**
 * The translate surface, as both the free {@link t} helper and `I18nService.t`
 * spell it. Overloaded so the second argument reads as params when it's an
 * object and as a locale when it's a string, and so `t(key, 'uk', 'en')` — two
 * locales — cannot be written.
 */
export interface Translate {
  (key: string): string;
  (key: string, params: TranslateParams): string;
  (key: string, locale: string): string;
  (key: string, params: TranslateParams, locale: string): string;
}

/**
 * The un-overloaded shape of {@link Translate} — what an implementation actually
 * receives, and what travels the ambient rail. Overloads describe the call site;
 * a value passed between functions needs the single signature they collapse to.
 */
export type TranslateImpl = (
  key: string,
  paramsOrLocale?: TranslateParams | string,
  locale?: string,
) => string;

/**
 * Per-locale message catalogs: `locale -> (key -> template)`. Keys are flat
 * strings (dot them for grouping, e.g. `'cart.empty'`); templates interpolate
 * `{name}` placeholders. Plain data, so catalogs can come from JSON, a loader,
 * or be inlined.
 */
export type Translations = Record<string, Record<string, string>>;

/** i18n settings independent of where the catalogs come from. */
interface I18nBaseOptions {
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

/**
 * i18n configuration for `I18nModule.forRoot`. Provide catalogs in exactly one
 * way: inline (`translations`), loaded from a `source` (a path to a locales
 * directory, or your own {@link TranslationSource}), or a {@link TranslatorBackend}
 * for a different message format (`backend`, e.g. a Fluent backend).
 */
export interface I18nOptions extends I18nBaseOptions {
  /** Inline per-locale catalogs. Provide this, {@link source}, or {@link backend}. */
  translations?: Translations;
  /**
   * Where to load catalogs from instead of inlining them, loaded once at
   * startup. Pass a **path** to a directory holding one `<locale>.json` / `.yaml`
   * file per locale, or your own {@link TranslationSource} to load from anywhere
   * else (a DB, a remote service). Provide this, {@link translations}, or
   * {@link backend}.
   *
   * ```ts
   * source: join(__dirname, 'locales')
   * ```
   */
  source?: string | TranslationSource;
  /**
   * A translator backend for a non-flat message format (e.g. `fluentBackend`).
   * Provide this, {@link translations}, or {@link source}.
   */
  backend?: TranslatorBackend;
}

/**
 * {@link I18nOptions} with the catalog resolved to a {@link TranslatorBackend} —
 * `translations`/`source` already wrapped in the flat backend, `source` already
 * loaded. What `I18nService` receives (the module normalises config at boot, so
 * the service never deals with loading or formats).
 */
export interface ResolvedI18nOptions extends I18nBaseOptions {
  backend: TranslatorBackend;
}

import type { TelegramExecutionContext } from '../engine/context';
import type { TranslationSource } from './sources/translation-source';
import type { TranslatorBackend } from './backends/translator-backend';

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
 * way: inline (`translations`), loaded from a {@link TranslationSource}
 * (`source`, e.g. {@link directoryTranslations}), or a {@link TranslatorBackend}
 * for a different message format (`backend`, e.g. a Fluent backend).
 */
export interface I18nOptions extends I18nBaseOptions {
  /** Inline per-locale catalogs. Provide this, {@link source}, or {@link backend}. */
  translations?: Translations;
  /**
   * Load catalogs from a source (a directory of files, a DB, …) instead of
   * inlining them. Loaded once at startup. Provide this, {@link translations},
   * or {@link backend}.
   */
  source?: TranslationSource;
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

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { Providers } from '../providers';
import { LOCALE, TRANSLATOR, TRANSLATOR_FACTORY } from './i18n.constants';
import { interpolate } from './translate';
import type { ResolvedI18nOptions, TranslateFn } from './i18n.types';

/**
 * Resolves the locale for each update and seeds the ambient store so the free
 * {@link t} / {@link locale} helpers work anywhere in the call chain — the i18n
 * counterpart of {@link SessionManager}, driven by {@link I18nStage}. Provided by
 * `I18nModule`; a no-op (returns the key) when its config is absent.
 *
 * Catalogs are static config, so a locale-bound translator is built once per
 * locale and reused; only the per-update locale lookup runs on the hot path.
 */
@Injectable()
export class I18nManager {
  private readonly logger = new Logger('I18n');
  private readonly translators = new Map<string, TranslateFn>();
  private readonly missingWarned = new Set<string>();

  constructor(
    @Optional()
    @Inject(Providers.I18N_OPTIONS)
    private readonly config?: ResolvedI18nOptions,
  ) {}

  resolve(ctx: TelegramExecutionContext): void {
    const config = this.config;
    if (!config) {
      return;
    }

    const resolved = this.resolveLocale(ctx, config);
    setAmbient(LOCALE, resolved);
    setAmbient(TRANSLATOR, this.translatorFor(resolved, config));
    // Lets the free `t(key, locale)` translate into an explicit locale anywhere
    // in this update's call chain, without DI.
    setAmbient(TRANSLATOR_FACTORY, (locale: string) =>
      this.translatorFor(locale, config),
    );
  }

  /**
   * A translator bound to an explicit locale, for code that runs OUTSIDE an
   * update's ambient context (e.g. a queue worker) and must carry the locale
   * itself. Returns an identity translator (key → key) when i18n is off.
   */
  translator(locale: string): TranslateFn {
    return this.config ? this.translatorFor(locale, this.config) : (key) => key;
  }

  private resolveLocale(
    ctx: TelegramExecutionContext,
    config: ResolvedI18nOptions,
  ): string {
    const resolve = config.resolveLocale ?? defaultResolveLocale;
    const candidate = resolve(ctx);
    // `Object.hasOwn`, not `in`: a sender `language_code` like 'toString' must
    // not match an inherited Object.prototype key and pass as a valid locale.
    return candidate !== undefined &&
      Object.hasOwn(config.translations, candidate)
      ? candidate
      : config.defaultLocale;
  }

  private translatorFor(
    locale: string,
    config: ResolvedI18nOptions,
  ): TranslateFn {
    const cached = this.translators.get(locale);
    if (cached) {
      return cached;
    }
    const fallback = config.fallbackLocale ?? config.defaultLocale;
    const translator: TranslateFn = (key, params) => {
      const template =
        config.translations[locale]?.[key] ??
        config.translations[fallback]?.[key];
      if (template === undefined) {
        // Returning the key is a safe, visible fallback; warn only when asked,
        // so a genuine catalog gap is catchable without noise in production.
        if (config.logMissingKeys) {
          this.warnMissingKey(locale, key);
        }
        return key;
      }
      return interpolate(template, params);
    };
    this.translators.set(locale, translator);
    return translator;
  }

  private warnMissingKey(locale: string, key: string): void {
    const marker = `${locale}:${key}`;
    if (this.missingWarned.has(marker)) {
      return;
    }
    this.missingWarned.add(marker);
    this.logger.warn(
      `Missing i18n key "${key}" for locale "${locale}" (and fallback) — ` +
        `returning the key verbatim.`,
    );
  }
}

/** Default locale resolution: the sender's Telegram `language_code`. */
function defaultResolveLocale(
  ctx: TelegramExecutionContext,
): string | undefined {
  return ctx.from?.language_code;
}

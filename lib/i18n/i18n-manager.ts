import { Inject, Injectable } from '@nestjs/common';

import { setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { Providers } from '../providers';
import type { NestgramModuleOptions } from '../module/nestgram-module.types';
import { LOCALE, TRANSLATOR } from './i18n.constants';
import { interpolate } from './translate';
import type { I18nOptions, TranslateFn } from './i18n.types';

/**
 * Resolves the locale for each update and seeds the ambient store so the free
 * {@link t} / {@link locale} helpers work anywhere in the call chain — the i18n
 * counterpart of {@link SessionManager}, called by the dispatcher as a pipeline
 * stage. A no-op when `i18n` isn't configured.
 *
 * Catalogs are static config, so a locale-bound translator is built once per
 * locale and reused; only the per-update locale lookup runs on the hot path.
 */
@Injectable()
export class I18nManager {
  private readonly translators = new Map<string, TranslateFn>();

  constructor(
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
  ) {}

  resolve(ctx: TelegramExecutionContext): void {
    const config = this.options.i18n;
    if (!config) {
      return;
    }

    const resolved = this.resolveLocale(ctx, config);
    setAmbient(LOCALE, resolved);
    setAmbient(TRANSLATOR, this.translatorFor(resolved, config));
  }

  private resolveLocale(
    ctx: TelegramExecutionContext,
    config: I18nOptions,
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

  private translatorFor(locale: string, config: I18nOptions): TranslateFn {
    const cached = this.translators.get(locale);
    if (cached) {
      return cached;
    }
    const fallback = config.fallbackLocale ?? config.defaultLocale;
    const translator: TranslateFn = (key, params) => {
      const template =
        config.translations[locale]?.[key] ??
        config.translations[fallback]?.[key] ??
        key;
      return interpolate(template, params);
    };
    this.translators.set(locale, translator);
    return translator;
  }
}

/** Default locale resolution: the sender's Telegram `language_code`. */
function defaultResolveLocale(
  ctx: TelegramExecutionContext,
): string | undefined {
  return ctx.from?.language_code;
}

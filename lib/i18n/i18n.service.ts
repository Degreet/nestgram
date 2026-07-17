import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import { getAmbient, setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { Providers } from '../providers';
import { LOCALE, TRANSLATE } from './i18n.constants';
import type {
  ResolvedI18nOptions,
  Translate,
  TranslateFn,
  TranslateParams,
} from './i18n.types';

/**
 * Resolves the locale for each update and seeds the ambient store so the free
 * {@link t} / {@link locale} helpers work anywhere in the call chain — the i18n
 * counterpart of {@link SessionService}, driven by {@link I18nStage}. Provided by
 * `I18nModule`; a no-op (returns the key) when its config is absent.
 *
 * It also translates directly — `i18n.t(key, params?, locale?)` — for code with
 * **no update in flight** (a queue worker, a cron): the free `t()` reads the
 * ambient rail and there is nothing on it there, whereas this service holds the
 * config itself. Injected, it needs no ambient context at all.
 *
 * Catalogs are static config, so a locale-bound translator is built once per
 * locale and reused; only the per-update locale lookup runs on the hot path.
 */
@Injectable()
export class I18nService {
  // Mathematical angle brackets (U+27E8/U+27E9): visually distinct and
  // near-absent from real message text, so a dev-mode missing key stands out.
  private static readonly MISSING_OPEN = '⟨';
  private static readonly MISSING_CLOSE = '⟩';

  private readonly logger = new Logger('I18n');
  private readonly translators = new Map<string, TranslateFn>();
  private readonly missingWarned = new Set<string>();

  constructor(
    @Optional()
    @Inject(Providers.I18N_OPTIONS)
    private readonly config?: ResolvedI18nOptions,
  ) {}

  /**
   * Translate a key into an explicit locale, or into the current update's locale
   * when none is given. The injected counterpart of the free {@link t}, and the
   * one implementation behind both — {@link resolve} seeds this very function on
   * the ambient rail, so the two doors cannot drift apart.
   *
   * Locale precedence: the explicit argument, then the current update's ambient
   * locale, then `defaultLocale`. That last step is what lets an injected caller
   * translate with no update in flight, which the free helper cannot do.
   */
  readonly t: Translate = (
    key: string,
    paramsOrLocale?: TranslateParams | string,
    explicitLocale?: string,
  ): string => {
    const config = this.config;
    if (!config) {
      return key;
    }
    const params =
      typeof paramsOrLocale === 'object' ? paramsOrLocale : undefined;
    const requested =
      typeof paramsOrLocale === 'string' ? paramsOrLocale : explicitLocale;
    const locale =
      requested ?? getAmbient<string>(LOCALE) ?? config.defaultLocale;
    return this.translatorFor(locale, config)(key, params);
  };

  resolve(ctx: TelegramExecutionContext): void {
    const config = this.config;
    if (!config) {
      return;
    }
    setAmbient(LOCALE, this.resolveLocale(ctx, config));
    setAmbient(TRANSLATE, this.t);
  }

  /**
   * A translator bound to an explicit locale, for handing a ready
   * {@link TranslateFn} to code that takes one (e.g. a queue worker carrying the
   * locale itself). Returns an identity translator (key → key) when i18n is off.
   */
  translator(locale: string): TranslateFn {
    return this.config ? this.translatorFor(locale, this.config) : (key) => key;
  }

  private resolveLocale(
    ctx: TelegramExecutionContext,
    config: ResolvedI18nOptions,
  ): string {
    const resolve = config.resolveLocale ?? I18nService.defaultResolveLocale;
    const candidate = resolve(ctx);
    return candidate !== undefined && config.backend.hasLocale(candidate)
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
      const text =
        config.backend.format(locale, key, params) ??
        config.backend.format(fallback, key, params);
      if (text === undefined) {
        if (config.logMissingKeys) {
          this.warnMissingKey(locale, key);
        }
        // In dev, surface the gap in the chat; in prod, the bare key is the
        // deliberate, safe fallback (never throw, always answer).
        return config.devMode ? I18nService.renderMissing(key, params) : key;
      }
      return text;
    };
    this.translators.set(locale, translator);
    return translator;
  }

  /**
   * A missing key as a visible dev marker: `⟨key⟩`, or the key followed by one
   * `name: value` line per param the call passed — readable when there are
   * several, where a comma-joined line runs together. The angle brackets are
   * near-absent from real message text, so a miss is obvious at a glance; `: `
   * (unlike `=`/`|`) is not reserved in MarkdownV2, so params add nothing to the
   * parse-mode footprint — only the key can.
   */
  private static renderMissing(key: string, params?: TranslateParams): string {
    const open = I18nService.MISSING_OPEN;
    const close = I18nService.MISSING_CLOSE;
    const entries = params ? Object.entries(params) : [];
    if (entries.length === 0) {
      return `${open}${key}${close}`;
    }
    const lines = entries
      .map(([name, value]) => `  ${name}: ${String(value)}`)
      .join('\n');
    return `${open}${key}\n${lines}${close}`;
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

  /** Default locale resolution: the sender's Telegram `language_code`. */
  private static defaultResolveLocale(
    ctx: TelegramExecutionContext,
  ): string | undefined {
    return ctx.from?.language_code;
  }
}

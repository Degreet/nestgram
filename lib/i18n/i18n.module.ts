import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';

import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import { FlatTranslatorBackend } from './backends/flat-translator-backend';
import { I18nService } from './i18n.service';
import { I18nStage } from './i18n.stage';
import { DirectoryTranslationSource } from './sources/directory-translation-source';
import type { TranslationSource } from './sources/translation-source';
import type {
  I18nOptions,
  ResolvedI18nOptions,
  Translations,
} from './i18n.types';

/**
 * Options for `I18nModule.forRootAsync` — resolve the catalogs from DI (e.g. a
 * loader, a Fluent backend, or `ConfigService`) instead of passing them literally.
 */
export interface I18nModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<I18nOptions> | I18nOptions;
}

/**
 * Enables i18n: per-locale catalogs reachable via the free `t()` / `locale()`
 * (and `@Locale()`), with the locale resolved per update by {@link I18nStage}.
 *
 * Import it once in your app — `I18nModule.forRoot({ translations, defaultLocale })`
 * — alongside `NestgramModule`. It's a self-contained module (nothing in the
 * engine is privileged): its stage is discovered by the dispatcher's stage hook,
 * and `I18nService` is exported so a queue worker can translate against an
 * explicit locale (`i18n.t(key, params, locale)`) with no update in flight.
 */
@Module({})
export class I18nModule {
  private static readonly providers: Provider[] = [I18nService, I18nStage];
  private static readonly moduleExports = [I18nService];

  static forRoot(options: I18nOptions): DynamicModule {
    return {
      module: I18nModule,
      global: true,
      providers: [
        {
          provide: Providers.I18N_OPTIONS,
          useFactory: () => this.resolveOptions(options),
        },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }

  static forRootAsync(options: I18nModuleAsyncOptions): DynamicModule {
    return {
      module: I18nModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: Providers.I18N_OPTIONS,
          useFactory: async (...args: unknown[]) =>
            this.resolveOptions(await options.useFactory(...args)),
          inject: options.inject ?? [],
        },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }

  /**
   * Normalise user config into resolved options: validate that exactly one of
   * `translations`/`source`/`backend` is set, eagerly load a source's catalogs
   * (once, at boot), and wrap the flat forms in {@link FlatTranslatorBackend} —
   * so the service only ever sees a ready {@link TranslatorBackend}.
   */
  private static async resolveOptions(
    options: I18nOptions,
  ): Promise<ResolvedI18nOptions> {
    const ways = [options.translations, options.source, options.backend].filter(
      (value) => value !== undefined,
    );
    if (ways.length !== 1) {
      throw new NestgramConfigError(
        'I18nModule: provide exactly one of `translations`, `source`, or `backend`',
      );
    }

    const { translations, source, backend, ...base } = options;
    const resolvedBackend =
      backend ??
      new FlatTranslatorBackend(
        // Exactly one is set (guarded above); with no backend/source, translations
        // is the one — the cast is that invariant, not a hole.
        source !== undefined
          ? await this.sourceOf(source).load()
          : (translations as Translations),
      );

    return { ...base, backend: resolvedBackend };
  }

  /** A path means the built-in directory loader; anything else is already a source. */
  private static sourceOf(
    source: string | TranslationSource,
  ): TranslationSource {
    return typeof source === 'string'
      ? new DirectoryTranslationSource(source)
      : source;
  }
}

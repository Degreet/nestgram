import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';

import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import { I18nManager } from './i18n-manager';
import { I18nStage } from './i18n.stage';
import type { I18nOptions, ResolvedI18nOptions } from './i18n.types';

/**
 * Options for `I18nModule.forRootAsync` — resolve the catalogs from DI (e.g. a
 * loader or `ConfigService`) instead of passing them literally.
 */
export interface I18nModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<I18nOptions> | I18nOptions;
}

/**
 * Normalise user config into resolved options: validate exactly one of
 * `translations`/`source`, and eagerly load the source's catalogs (once, at
 * boot) so the manager only ever sees a ready `translations` map.
 */
async function resolveI18nOptions(
  options: I18nOptions,
): Promise<ResolvedI18nOptions> {
  if (options.translations && options.source) {
    throw new NestgramConfigError(
      'I18nModule: provide either `translations` or `source`, not both',
    );
  }
  const { source, translations, ...base } = options;
  const resolved = source ? await source.load() : translations;
  if (!resolved) {
    throw new NestgramConfigError(
      'I18nModule: provide `translations` or a `source`',
    );
  }
  return { ...base, translations: resolved };
}

/**
 * Enables i18n: per-locale catalogs reachable via the free `t()` / `locale()`
 * (and `@Locale()`), with the locale resolved per update by {@link I18nStage}.
 *
 * Import it once in your app — `I18nModule.forRoot({ translations, defaultLocale })`
 * — alongside `NestgramModule`. It's a self-contained module (nothing in the
 * engine is privileged): its stage is discovered by the dispatcher's stage hook,
 * and `I18nManager` is exported so a queue worker can translate against an
 * explicit locale (`i18n.translator(locale)`) even without an update in flight.
 */
@Module({})
export class I18nModule {
  private static readonly providers: Provider[] = [I18nManager, I18nStage];
  private static readonly moduleExports = [I18nManager];

  static forRoot(options: I18nOptions): DynamicModule {
    return {
      module: I18nModule,
      global: true,
      providers: [
        {
          provide: Providers.I18N_OPTIONS,
          useFactory: () => resolveI18nOptions(options),
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
            resolveI18nOptions(await options.useFactory(...args)),
          inject: options.inject ?? [],
        },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }
}

import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';

import { Providers } from '../providers';
import { I18nManager } from './i18n-manager';
import { I18nStage } from './i18n.stage';
import type { I18nOptions } from './i18n.types';

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
        { provide: Providers.I18N_OPTIONS, useValue: options },
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
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }
}

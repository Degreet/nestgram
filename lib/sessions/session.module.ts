import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';

import { Providers } from '../providers';
import { SessionManager } from './session-manager';
import { SessionStage } from './session.stage';
import type { SessionOptions } from './session.types';

/**
 * Options for `SessionModule.forRootAsync` — resolve the store/key/defaults from
 * DI (e.g. a Redis store built from `ConfigService`) instead of passing them
 * literally.
 */
export interface SessionModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<SessionOptions> | SessionOptions;
}

/**
 * Enables persistent per-update sessions, reachable via `@Session()`, loaded and
 * saved per update by {@link SessionStage}.
 *
 * Import it once in your app — `SessionModule.forRoot({ store, defaults })` —
 * alongside `NestgramModule`. Self-contained (no privileged core): its stage is
 * discovered by the dispatcher's stage hook, and the store/key strategy are
 * swappable. Omit it to keep sessions off (`@Session()` then resolves to
 * `undefined`).
 */
@Module({})
export class SessionModule {
  private static readonly providers: Provider[] = [
    SessionManager,
    SessionStage,
  ];
  private static readonly moduleExports = [SessionManager];

  static forRoot(options: SessionOptions = {}): DynamicModule {
    return {
      module: SessionModule,
      global: true,
      providers: [
        { provide: Providers.SESSION_OPTIONS, useValue: options },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }

  static forRootAsync(options: SessionModuleAsyncOptions): DynamicModule {
    return {
      module: SessionModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: Providers.SESSION_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }
}

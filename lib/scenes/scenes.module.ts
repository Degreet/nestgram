import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { Providers } from '../providers';
import { SceneRegistry } from './scene.registry';
import { SceneService } from './scene.service';
import { SceneStage } from './scene.stage';
import type { ScenesOptions } from './scenes.types';

/**
 * Options for `ScenesModule.forRootAsync` — resolve the store/key from DI (e.g. a
 * Redis store built from `ConfigService`) instead of passing them literally.
 */
export interface ScenesModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<ScenesOptions> | ScenesOptions;
}

/**
 * Enables wizard / multi-step scenes: declare a `@Scene('id')` with ordered
 * `@Step()` handlers and `@OnEnter`/`@OnLeave` hooks, drive it with `@SceneCtx()`.
 *
 * A scene is FSM + structure — it adds no engine, compiling down to the existing
 * pipeline: its `@Step()` handlers are discovered like any router and gated to the
 * active scene+step. Import it once alongside `NestgramModule` —
 * `ScenesModule.forRoot({ store })` — and list your `@Scene` classes in a module's
 * `providers`. Point the store at the same instance as sessions/FSM to share
 * persistence. Self-contained (no privileged core): its stage is discovered by
 * the dispatcher's stage hook.
 */
@Module({})
export class ScenesModule {
  private static readonly providers: Provider[] = [
    SceneRegistry,
    SceneService,
    SceneStage,
  ];
  private static readonly moduleExports = [SceneRegistry];

  static forRoot(options: ScenesOptions = {}): DynamicModule {
    return {
      module: ScenesModule,
      global: true,
      imports: [DiscoveryModule],
      providers: [
        { provide: Providers.SCENES_OPTIONS, useValue: options },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }

  static forRootAsync(options: ScenesModuleAsyncOptions): DynamicModule {
    return {
      module: ScenesModule,
      global: true,
      imports: [DiscoveryModule, ...(options.imports ?? [])],
      providers: [
        {
          provide: Providers.SCENES_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }
}

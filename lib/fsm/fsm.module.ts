import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';

import { Providers } from '../providers';
import { FsmManager } from './fsm-manager';
import { FsmStage } from './fsm.stage';
import type { FsmOptions } from './fsm.types';

/**
 * Options for `FsmModule.forRootAsync` — resolve the store/key from DI (e.g. a
 * Redis store built from `ConfigService`) instead of passing them literally.
 */
export interface FsmModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<FsmOptions> | FsmOptions;
}

/**
 * Enables aiogram-style finite-state-machine flows: route on the current state
 * with `@OnMessage(Reg.name)`, read/transition it with `@Fsm()`.
 *
 * Import it once alongside `NestgramModule` — `FsmModule.forRoot({ store })`.
 * Self-contained (no privileged core): its stage is discovered by the
 * dispatcher's stage hook, and the store/key strategy are swappable. Omit it to
 * keep FSM off (state predicates then never match; a transition would throw).
 */
@Module({})
export class FsmModule {
  private static readonly providers: Provider[] = [FsmManager, FsmStage];
  private static readonly moduleExports = [FsmManager];

  static forRoot(options: FsmOptions = {}): DynamicModule {
    return {
      module: FsmModule,
      global: true,
      providers: [
        { provide: Providers.FSM_OPTIONS, useValue: options },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }

  static forRootAsync(options: FsmModuleAsyncOptions): DynamicModule {
    return {
      module: FsmModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: Providers.FSM_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        ...this.providers,
      ],
      exports: this.moduleExports,
    };
  }
}

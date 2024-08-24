import { DynamicModule, Module, Provider } from '@nestjs/common';

import { Providers } from '../enums';

import {
  DispatcherAsyncOptions,
  DispatcherOptions,
} from '../types/DispatcherOptions';

@Module({})
export class DispatcherModule {
  public static forRoot(options: DispatcherOptions): DynamicModule {
    return {
      module: DispatcherModule,
      providers: [
        {
          provide: Providers.DISPATCHER_OPTIONS,
          useValue: options,
        },
      ],
      exports: [Providers.DISPATCHER_OPTIONS],
    };
  }

  public static forRootAsync(options: DispatcherAsyncOptions): DynamicModule {
    const providers = this.createAsyncProviders(options);

    return {
      module: DispatcherModule,
      imports: options.imports ?? [],
      providers: [...providers],
      exports: [Providers.DISPATCHER_OPTIONS],
    };
  }

  private static createAsyncProviders(
    options: DispatcherAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: Providers.DISPATCHER_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const useClass = options.useClass ?? options.useExisting;
    return [
      {
        provide: Providers.DISPATCHER_OPTIONS,
        useFactory: async (options: DispatcherOptions) => options,
        inject: [useClass],
      },
      {
        provide: useClass,
        useClass,
      },
    ];
  }
}

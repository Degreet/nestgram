import { DiscoveryModule } from '@nestjs/core';
import { DynamicModule, Module, Provider } from '@nestjs/common';

import { BotAsyncOptions, BotOptions } from '../types';
import { Providers } from '../enums';
import { BotService } from './bot.service';

@Module({
  imports: [DiscoveryModule],
})
export class BotModule {
  public static forRoot(options: BotOptions): DynamicModule {
    return {
      module: BotModule,
      providers: [
        {
          provide: Providers.OPTIONS,
          useValue: options,
        },
        {
          provide: Providers.TOKEN,
          useValue: options.token,
        },
        {
          provide: BotService,
          useClass: BotService,
        },
      ],
      exports: [Providers.TOKEN, BotService],
    };
  }

  public static forRootAsync(options: BotAsyncOptions): DynamicModule {
    const providers = this.createAsyncProviders(options);

    return {
      module: BotModule,
      imports: options.imports ?? [],
      providers: [
        ...providers,
        {
          provide: Providers.TOKEN,
          useFactory: (options: BotOptions) => options.token,
          inject: [Providers.OPTIONS],
        },
        {
          provide: BotService,
          useClass: BotService,
        },
      ],
      exports: [Providers.TOKEN, BotService],
    };
  }

  private static createAsyncProviders(options: BotAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: Providers.OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const useClass = options.useClass ?? options.useExisting;
    return [
      {
        provide: Providers.OPTIONS,
        useFactory: async (options: BotOptions) => options,
        inject: [useClass],
      },
      {
        provide: useClass,
        useClass,
      },
    ];
  }
}

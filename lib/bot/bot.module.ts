import { DynamicModule, Global, Module, Provider } from '@nestjs/common';

import { BotService } from './bot.service';

import { BotAsyncOptions, BotOptions } from '../types';
import { Providers } from '../enums';

@Global()
@Module({})
export class BotModule {
  public static forRoot(options: BotOptions): DynamicModule {
    return {
      module: BotModule,
      providers: [
        {
          provide: Providers.BOT_OPTIONS,
          useValue: options,
        },
        {
          provide: BotService,
          useClass: BotService,
        },
      ],
      exports: [Providers.BOT_OPTIONS, BotService],
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
          provide: BotService,
          useClass: BotService,
        },
      ],
      exports: [Providers.BOT_OPTIONS, BotService],
    };
  }

  private static createAsyncProviders(options: BotAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: Providers.BOT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const useClass = options.useClass ?? options.useExisting;
    return [
      {
        provide: Providers.BOT_OPTIONS,
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

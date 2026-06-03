import { DynamicModule, Global, Module, Provider } from '@nestjs/common';

import { BotService } from './bot.service';

import { BotAsyncOptions, BotOptions } from './bot-options';
import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import {
  DefaultParseModeTransformer,
  REQUEST_TRANSFORMERS,
  RequestPipeline,
} from './request';

@Global()
@Module({})
export class BotModule {
  /**
   * Providers for the outbound request pipeline. The default parse-mode hook is
   * registered as an ordinary transformer (multi-provider) — users add their
   * own through the same {@link REQUEST_TRANSFORMERS} token. (`multi` is a valid
   * runtime option; Nest 10's provider types just omit it, so this isn't a
   * `Provider[]`-annotated literal.)
   */
  private static readonly pipelineProviders = [
    RequestPipeline,
    {
      provide: REQUEST_TRANSFORMERS,
      useClass: DefaultParseModeTransformer,
      multi: true,
    },
  ];

  static forRoot(options: BotOptions): DynamicModule {
    return {
      module: BotModule,
      providers: [
        {
          provide: Providers.BOT_OPTIONS,
          useValue: options,
        },
        ...this.pipelineProviders,
        {
          provide: BotService,
          useClass: BotService,
        },
      ],
      exports: [Providers.BOT_OPTIONS, BotService],
    };
  }

  static forRootAsync(options: BotAsyncOptions): DynamicModule {
    return {
      module: BotModule,
      imports: options.imports ?? [],
      providers: [
        ...this.createAsyncProviders(options),
        ...this.pipelineProviders,
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

    const optionsClass = options.useClass ?? options.useExisting;
    if (!optionsClass) {
      throw new NestgramConfigError(
        'BotModule.forRootAsync requires one of useFactory, useClass or useExisting',
      );
    }

    const providers: Provider[] = [
      {
        provide: Providers.BOT_OPTIONS,
        useFactory: async (factory: BotOptions) => factory,
        inject: [optionsClass],
      },
    ];

    if (options.useClass) {
      providers.push({ provide: options.useClass, useClass: options.useClass });
    }

    return providers;
  }
}

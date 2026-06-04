import { DynamicModule, Global, Module, Provider } from '@nestjs/common';

import { BotService } from './bot.service';

import { BotAsyncOptions, BotOptions } from './bot-options';
import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import {
  DefaultParseModeTransformer,
  REQUEST_TRANSFORMERS,
  RequestPipeline,
  RequestTransformer,
  TokenValidationTransformer,
} from './request';

@Global()
@Module({})
export class BotModule {
  /**
   * Providers for the outbound request pipeline. `REQUEST_TRANSFORMERS` is the
   * ordered array of transformers `RequestPipeline` runs: token validation first
   * (its constructor also fail-fasts on a missing configured token at boot),
   * then the default parse-mode hook. Supplied as an explicit array (not a
   * `multi` provider): Nest 10.4.1's `multi: true` does not aggregate here — it
   * collapses to a single instance, which then isn't iterable. Restoring
   * user-extension via the token is tracked separately.
   */
  private static readonly pipelineProviders: Provider[] = [
    TokenValidationTransformer,
    DefaultParseModeTransformer,
    {
      provide: REQUEST_TRANSFORMERS,
      useFactory: (
        tokenValidation: TokenValidationTransformer,
        defaultParseMode: DefaultParseModeTransformer,
      ): RequestTransformer[] => [tokenValidation, defaultParseMode],
      inject: [TokenValidationTransformer, DefaultParseModeTransformer],
    },
    RequestPipeline,
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

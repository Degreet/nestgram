import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';

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
   * ordered array `RequestPipeline` runs: the built-ins (token validation first —
   * its constructor also fail-fasts on a missing configured token at boot — then
   * the default parse-mode hook), followed by any user-supplied transformers.
   *
   * Built as an explicit array via `useFactory` (not a `multi` provider): Nest
   * 10.4.1's `multi: true` does not aggregate here (it collapses to a single,
   * non-iterable instance), so the factory injects every transformer and returns
   * them as the array — which also lets users extend the pipeline.
   */
  private static pipelineProviders(
    userTransformers: Type<RequestTransformer>[],
  ): Provider[] {
    return [
      TokenValidationTransformer,
      DefaultParseModeTransformer,
      ...userTransformers,
      {
        provide: REQUEST_TRANSFORMERS,
        useFactory: (
          ...transformers: RequestTransformer[]
        ): RequestTransformer[] => transformers,
        inject: [
          TokenValidationTransformer,
          DefaultParseModeTransformer,
          ...userTransformers,
        ],
      },
      RequestPipeline,
    ];
  }

  static forRoot(options: BotOptions): DynamicModule {
    return {
      module: BotModule,
      providers: [
        {
          provide: Providers.BOT_OPTIONS,
          useValue: options,
        },
        ...this.pipelineProviders(options.transformers ?? []),
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
        ...this.pipelineProviders(options.transformers ?? []),
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

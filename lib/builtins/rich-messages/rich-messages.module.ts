import { DynamicModule, Module } from '@nestjs/common';

import { NestgramConfigError } from '../../exceptions';
import {
  RICH_MESSAGES_SETTINGS,
  RichMessageDialect,
  RichMessagesMode,
  RichMessagesOptions,
  RichMessagesSettings,
} from './rich-messages.types';

/**
 * Opt-in rich-by-default sending (Bot API 10.1). Import it once —
 * `RichMessagesModule.forRoot({ dialect: 'markdown' })` — and every plain
 * outgoing text (`return 'text'`, `message.answer()`, `reply()`) is sent as
 * `sendRichMessage` with the text as that dialect's source. With
 * `mode: 'dynamic'` only texts using rich-only constructs (headings, tables,
 * dividers) are rewritten; everything else stays a normal `sendMessage`.
 *
 * The module only contributes the settings token (globally, so it reaches
 * BotModule's injector); the rewrite itself is the `RichMessagesInterceptor`
 * already sitting in BotModule's ordered pipeline, inert without settings —
 * the same arrangement as the throttler, keeping interceptor order owned by
 * BotModule.
 *
 * Import it once, in the root module. A second `forRoot` registers the same
 * global token again and Nest silently keeps one of them (the usual
 * no-multi-providers collapse) — there is no error and no defined winner.
 */
@Module({})
export class RichMessagesModule {
  private static readonly DIALECTS: readonly RichMessageDialect[] = [
    'markdown',
    'html',
  ];
  private static readonly MODES: readonly RichMessagesMode[] = [
    'always',
    'dynamic',
  ];
  private static readonly DEFAULT_MODE: RichMessagesMode = 'always';

  static forRoot(options: RichMessagesOptions): DynamicModule {
    if (!RichMessagesModule.DIALECTS.includes(options.dialect)) {
      throw new NestgramConfigError(
        `RichMessagesModule.forRoot: unknown dialect "${String(
          options.dialect,
        )}" — expected one of: ${RichMessagesModule.DIALECTS.join(', ')}`,
      );
    }
    if (
      options.mode !== undefined &&
      !RichMessagesModule.MODES.includes(options.mode)
    ) {
      throw new NestgramConfigError(
        `RichMessagesModule.forRoot: unknown mode "${String(
          options.mode,
        )}" — expected one of: ${RichMessagesModule.MODES.join(', ')}`,
      );
    }
    return {
      module: RichMessagesModule,
      global: true,
      providers: [
        {
          provide: RICH_MESSAGES_SETTINGS,
          useValue: {
            dialect: options.dialect,
            mode: options.mode ?? RichMessagesModule.DEFAULT_MODE,
          } satisfies RichMessagesSettings,
        },
      ],
      exports: [RICH_MESSAGES_SETTINGS],
    };
  }
}

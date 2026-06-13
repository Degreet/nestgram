import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { of } from 'rxjs';

import { RichMessagesInterceptor } from './rich-messages.interceptor';
import { BotModule } from '../../api/bot.module';
import { DefaultParseModeInterceptor } from '../parse-mode';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiRequest,
} from '../../api/request';
const noop: ApiCallHandler = { handle: () => of(undefined) };

function sendMessageRequest(): {
  ctx: ApiExecutionContext;
  request: ApiRequest;
} {
  const request: ApiRequest = {
    method: 'sendMessage',
    payload: { chat_id: 1, text: 'hi' },
    token: 'T',
  };
  const ctx: ApiExecutionContext = {
    getRequest: () => request,
    getMethod: () => ({ method: 'sendMessage' } as never),
    getSignal: () => undefined,
    getType: () => 'telegram:api',
  };
  return { ctx, request };
}

describe('richMessages option', () => {
  it('feeds its settings into the pipeline interceptor when set', async () => {
    @Module({
      imports: [
        BotModule.forRoot({
          token: '1:T',
          richMessages: { dialect: 'markdown' },
        }),
      ],
    })
    class AppModule {}

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    try {
      const interceptor = app.get(RichMessagesInterceptor);
      const { ctx, request } = sendMessageRequest();
      interceptor.intercept(ctx, noop);
      expect(request.method).toBe('sendRichMessage');
      expect(request.payload).toEqual({
        chat_id: 1,
        rich_message: { markdown: 'hi' },
      });
    } finally {
      await app.close();
    }
  });

  it('stays opt-in: without the option the interceptor is a passthrough', async () => {
    @Module({
      imports: [BotModule.forRoot({ token: '1:T' })],
    })
    class PlainAppModule {}

    const app = await NestFactory.createApplicationContext(PlainAppModule, {
      logger: false,
    });
    try {
      const interceptor = app.get(RichMessagesInterceptor);
      const { ctx, request } = sendMessageRequest();
      interceptor.intercept(ctx, noop);
      expect(request.method).toBe('sendMessage');
      expect(request.payload).toEqual({ chat_id: 1, text: 'hi' });
    } finally {
      await app.close();
    }
  });

  it('a configured default parseMode never leaks into the rewritten rich call', async () => {
    @Module({
      imports: [
        BotModule.forRoot({
          token: '1:T',
          parseMode: 'HTML',
          richMessages: { dialect: 'markdown' },
        }),
      ],
    })
    class ParseModeAppModule {}

    const app = await NestFactory.createApplicationContext(ParseModeAppModule, {
      logger: false,
    });
    try {
      // Pipeline order: the rich rewrite runs before the parse-mode injector —
      // exactly what keeps the injected default out of the rich payload.
      const rich = app.get(RichMessagesInterceptor);
      const parseMode = app.get(DefaultParseModeInterceptor);
      const { ctx, request } = sendMessageRequest();
      rich.intercept(ctx, noop);
      parseMode.intercept(ctx, noop);
      expect(request.method).toBe('sendRichMessage');
      expect('parse_mode' in request.payload).toBe(false);
    } finally {
      await app.close();
    }
  });
});

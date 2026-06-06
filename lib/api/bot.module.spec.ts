import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { BotModule } from './bot.module';
import { Providers } from '../providers';
import { DefaultSendThrottler, SendThrottler } from './request';

@Module({ imports: [BotModule.forRoot({ token: '1:T' })] })
class DefaultApp {}

class CustomThrottler implements SendThrottler {
  run<R>(
    _chatId: number | string | undefined,
    _signal: AbortSignal | undefined,
    send: () => Promise<R>,
  ): Promise<R> {
    return send();
  }
}

@Module({
  imports: [BotModule.forRoot({ token: '1:T', throttler: CustomThrottler })],
})
class CustomApp {}

describe('BotModule throttler wiring', () => {
  it('provides the DefaultSendThrottler by default', async () => {
    const app = await NestFactory.createApplicationContext(DefaultApp, {
      logger: false,
    });
    expect(app.get(Providers.THROTTLER)).toBeInstanceOf(DefaultSendThrottler);
    await app.close();
  });

  it('uses a custom throttler when one is provided', async () => {
    const app = await NestFactory.createApplicationContext(CustomApp, {
      logger: false,
    });
    expect(app.get(Providers.THROTTLER)).toBeInstanceOf(CustomThrottler);
    await app.close();
  });
});

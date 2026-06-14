import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { Command } from '../decorators/listeners/command.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { UpdateDispatcher } from '../engine/dispatcher';
import { Message } from '../events';
import { RawUpdate } from '../events/raw-update.types';
import { NestgramModule } from '../module';
import { RateLimit, SkipRateLimit } from './rate-limit.decorators';
import { RateLimitModule } from './rate-limit.module';

const LIMIT = 2;
const WINDOW_MS = 1_000;

@Router()
class FloodRouter {
  readonly limited: number[] = [];
  readonly free: number[] = [];

  @Command('ping')
  @RateLimit({ limit: LIMIT, windowMs: WINDOW_MS })
  ping(message: Message): void {
    this.limited.push(message.message_id);
  }

  @Command('status')
  @SkipRateLimit()
  status(message: Message): void {
    this.free.push(message.message_id);
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({ token: 'TEST' }),
    RateLimitModule.forRoot({ default: { limit: LIMIT, windowMs: WINDOW_MS } }),
  ],
  providers: [FloodRouter],
})
class RateLimitAppModule {}

function command(update_id: number, text: string, userId = 7): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: userId, is_bot: false, first_name: 'U' },
      text,
    },
  };
}

describe('Rate limit (integration)', () => {
  it('drops a per-user flood past the limit, isolates users, exempts @SkipRateLimit', async () => {
    const app = await NestFactory.createApplicationContext(RateLimitAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(FloodRouter);

    // Three /ping from the same user within the window: only the first two run.
    await dispatcher.dispatch(command(1, '/ping'));
    await dispatcher.dispatch(command(2, '/ping'));
    await dispatcher.dispatch(command(3, '/ping')); // dropped, handler not invoked
    expect(router.limited).toEqual([1, 2]);

    // A different user has their own bucket — not affected by user 7's flood.
    await dispatcher.dispatch(command(4, '/ping', 9));
    expect(router.limited).toEqual([1, 2, 4]);

    // @SkipRateLimit handler is never limited, even under user 7's flood.
    await dispatcher.dispatch(command(5, '/status'));
    await dispatcher.dispatch(command(6, '/status'));
    await dispatcher.dispatch(command(7, '/status'));
    expect(router.free).toEqual([5, 6, 7]);

    await app.close();
  });
});

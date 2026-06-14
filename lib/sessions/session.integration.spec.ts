import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { Command } from '../decorators/listeners/command.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { Session } from '../decorators/params/session.decorator';
import { Message } from '../events';
import { RawUpdate } from '../events/raw-update.types';
import { UpdateDispatcher } from '../engine/dispatcher';
import { NestgramModule } from '../module';
import { MemorySessionStore } from './memory-session-store';
import { SessionModule } from './session.module';

interface Counter {
  count: number;
}

@Router()
class CounterRouter {
  readonly seen: number[] = [];

  @Command('inc')
  inc(_message: Message, @Session() session: Counter): void {
    session.count += 1; // mutate in place — persisted after the handler
    this.seen.push(session.count);
  }
}

const store = new MemorySessionStore();

@Module({
  imports: [
    NestgramModule.forRoot({ token: 'TEST' }),
    SessionModule.forRoot({ store, defaults: (): Counter => ({ count: 0 }) }),
  ],
  providers: [CounterRouter],
})
class SessionAppModule {}

function incFrom(update_id: number, userId: number): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: userId, is_bot: false, first_name: 'U' },
      text: '/inc',
    },
  };
}

describe('Sessions (integration)', () => {
  it('persists a per-user-per-chat session across updates, mutated in place', async () => {
    const app = await NestFactory.createApplicationContext(SessionAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(CounterRouter);

    await dispatcher.dispatch(incFrom(1, 7));
    await dispatcher.dispatch(incFrom(2, 7)); // same user — continues from 1
    await dispatcher.dispatch(incFrom(3, 9)); // different user — own session

    // @Session injected the loaded session each time; per-user-per-chat keeps
    // user 7 and user 9 apart even in the same chat. The key is scoped by the
    // bot too (here the default bot → `ndefault` prefix).
    expect(router.seen).toEqual([1, 2, 1]);
    expect(store.get('ndefault:c1:u7')).toEqual({ count: 2 });
    expect(store.get('ndefault:c1:u9')).toEqual({ count: 1 });

    await app.close();
  });
});

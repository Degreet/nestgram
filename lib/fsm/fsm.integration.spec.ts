import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { Command } from '../decorators/listeners/command.decorator';
import { OnMessage } from '../decorators/listeners/on-message.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { Fsm } from '../decorators/params/fsm.decorator';
import { Message } from '../events';
import { RawUpdate } from '../events/raw-update.types';
import { UpdateDispatcher } from '../engine/dispatcher';
import { NestgramModule } from '../module';
import { MemoryStore } from '../store';
import { FsmContext } from './fsm.context';
import { FsmModule } from './fsm.module';
import { stateGroup } from './state';
import { AnyState, NoState } from './state-filter.decorators';

interface RegData {
  name: string;
  age: string;
}

const Reg = stateGroup('reg', ['name', 'age']);

@Router()
class RegRouter {
  readonly log: string[] = [];

  // Declared FIRST so /cancel wins over the state-step handlers, which would
  // otherwise swallow it as input (first-match-wins).
  @Command('cancel')
  @AnyState()
  async cancel(_message: Message, @Fsm() fsm: FsmContext): Promise<void> {
    this.log.push('cancel');
    await fsm.clear();
  }

  @Command('start')
  async start(
    _message: Message,
    @Fsm() fsm: FsmContext<RegData>,
  ): Promise<void> {
    await fsm.set(Reg.name);
    this.log.push('start');
  }

  @OnMessage(Reg.name)
  async name(message: Message, @Fsm() fsm: FsmContext<RegData>): Promise<void> {
    await fsm.update({ name: message.text });
    await fsm.set(Reg.age);
    this.log.push(`name:${message.text}`);
  }

  @OnMessage(Reg.age)
  async age(message: Message, @Fsm() fsm: FsmContext<RegData>): Promise<void> {
    this.log.push(`age:${fsm.data().name}/${message.text}`);
    await fsm.clear();
  }

  @OnMessage()
  @NoState()
  echo(message: Message): void {
    this.log.push(`echo:${message.text}`);
  }
}

const store = new MemoryStore();

@Module({
  imports: [
    NestgramModule.forRoot({ token: 'TEST' }),
    FsmModule.forRoot({ store }),
  ],
  providers: [RegRouter],
})
class FsmAppModule {}

function text(update_id: number, body: string): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'U' },
      text: body,
    },
  };
}

describe('FSM (integration)', () => {
  it('runs a multi-step flow, routing by state with write-through transitions', async () => {
    const app = await NestFactory.createApplicationContext(FsmAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(RegRouter);
    router.log.length = 0;

    await dispatcher.dispatch(text(1, '/start')); // idle → enter reg:name
    await dispatcher.dispatch(text(2, 'Alice')); // reg:name → store name, enter reg:age
    await dispatcher.dispatch(text(3, '30')); // reg:age → read name, clear
    await dispatcher.dispatch(text(4, 'hi')); // idle → echo (NoState)

    expect(router.log).toEqual([
      'start',
      'name:Alice',
      'age:Alice/30',
      'echo:hi',
    ]);
    expect(store.get('fsm:c1:u7')).toBeUndefined(); // cleared after the flow

    await app.close();
  });

  it('@AnyState() cancels only while a flow is active', async () => {
    const app = await NestFactory.createApplicationContext(FsmAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(RegRouter);
    router.log.length = 0;

    await dispatcher.dispatch(text(10, '/cancel')); // idle → cancel skipped; echo catches it
    await dispatcher.dispatch(text(11, '/start')); // enter reg:name
    await dispatcher.dispatch(text(12, '/cancel')); // active → cancel fires, clears

    expect(router.log).toEqual(['echo:/cancel', 'start', 'cancel']);
    expect(store.get('fsm:c1:u7')).toBeUndefined();

    await app.close();
  });
});

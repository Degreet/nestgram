import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { Event } from '../decorators/params/event.decorator';
import { OnMessage } from '../decorators/listeners/on-message.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { RouteTable } from '../discovery';
import { UpdateDispatcher } from '../runtime';
import { RawUpdate } from '../types/raw-update.types';
import { NestgramModule } from './nestgram.module';

/**
 * A real router: discovered via the provider graph (no `routers` list), invoked
 * through the full ECC pipeline. Uses an explicit `@Event()` since auto-apply is
 * a later step. Records what it saw instead of replying, so no network is hit.
 */
@Router()
class GreetRouter {
  seen: RawUpdate['message'][] = [];

  @OnMessage()
  onMessage(@Event() message: RawUpdate['message']): void {
    this.seen.push(message);
  }
}

// The documented bootstrap shape: a plain Nest module importing NestgramModule.
// `polling` is omitted so no transport starts — no network during the test.
@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [GreetRouter],
})
class AppModule {}

function messageUpdate(update_id: number, text: string): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Alice' },
      text,
    },
  };
}

describe('NestgramModule (integration)', () => {
  it('boots: builds the route table by discovery and dispatches through ECC', async () => {
    // createApplicationContext runs OnApplicationBootstrap, building the table.
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    const table = app.get(RouteTable);
    expect(table.size).toBe(1);
    expect(table.ofType('message')).toHaveLength(1);

    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(GreetRouter);

    await dispatcher.dispatch(messageUpdate(1, '/start'));

    expect(router.seen).toHaveLength(1);
    expect(router.seen[0]?.text).toBe('/start');

    await app.close();
  });

  it('does not require a routers array in forRoot (discovery handles it)', async () => {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    // The only place GreetRouter is named is the providers array; forRoot got
    // no routers list, yet the route table still found it.
    expect(app.get(RouteTable).size).toBe(1);

    await app.close();
  });
});

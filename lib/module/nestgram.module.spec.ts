import { Injectable, Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { BotService } from '../api';
import { Command } from '../decorators/listeners/command.decorator';
import { OnMessage } from '../decorators/listeners/on-message.decorator';
import { OnCallbackQuery } from '../decorators/listeners/on-callback-query.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { Sender } from '../decorators/params/sender.decorator';
import { Args } from '../decorators/params/args.decorator';
import { RouteTable } from '../engine/discovery';
import { UpdateDispatcher } from '../engine/dispatcher';
import { RawUpdate } from '../events/raw-update.types';
import { User } from '../events/user';
import { NestgramModule } from './nestgram.module';

/**
 * A real router: discovered via the provider graph (no `routers` list), invoked
 * through the full ECC pipeline. The first parameter is an undecorated typed
 * event — the framework auto-applies `@Event()` to it. Records what it saw
 * instead of replying, so no network is hit.
 */
@Router()
class GreetRouter {
  seen: RawUpdate['message'][] = [];

  @OnMessage()
  onMessage(message: RawUpdate['message']): void {
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

// A ConfigService stand-in: the realistic forRootAsync case where the token
// comes from injected config rather than a literal.
@Injectable()
class FakeConfig {
  readonly token = 'ASYNC_TOKEN';
}

@Module({ providers: [FakeConfig], exports: [FakeConfig] })
class FakeConfigModule {}

@Module({
  imports: [
    NestgramModule.forRootAsync({
      imports: [FakeConfigModule],
      inject: [FakeConfig],
      useFactory: (config: FakeConfig) => ({ token: config.token }),
    }),
  ],
  providers: [GreetRouter],
})
class AsyncAppModule {}

describe('NestgramModule.forRootAsync (integration)', () => {
  it('resolves options from DI and threads the token down to BotService', async () => {
    const app = await NestFactory.createApplicationContext(AsyncAppModule, {
      logger: false,
    });

    // Token resolved via the injected config factory reached the transport.
    expect(app.get(BotService).token).toBe('ASYNC_TOKEN');
    // Engine still wired: discovery built the route table.
    expect(app.get(RouteTable).size).toBe(1);

    await app.close();
  });
});

// Content matching end to end: @Command must win over a generic @OnMessage for
// a matching command, and fall through to it otherwise (first-match routing).
@Router()
class CommandRouter {
  hits: string[] = [];

  @Command('start')
  start(): void {
    this.hits.push('start');
  }

  @OnMessage()
  echo(): void {
    this.hits.push('echo');
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [CommandRouter],
})
class CommandAppModule {}

describe('match predicates (integration)', () => {
  it('routes /start to @Command and other text to @OnMessage', async () => {
    const app = await NestFactory.createApplicationContext(CommandAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(CommandRouter);

    await dispatcher.dispatch(messageUpdate(1, '/start'));
    await dispatcher.dispatch(messageUpdate(2, 'just chatting'));

    expect(router.hits).toEqual(['start', 'echo']);

    await app.close();
  });
});

// Stacking listener decorators on one method binds it to several update types —
// no @On([...]) union needed (listener metadata is an array).
@Router()
class MultiRouter {
  hits: string[] = [];

  @OnMessage()
  @OnCallbackQuery()
  handle(): void {
    this.hits.push('hit');
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [MultiRouter],
})
class MultiAppModule {}

describe('stacked listener decorators (integration)', () => {
  it('binds one method to several update types', async () => {
    const app = await NestFactory.createApplicationContext(MultiAppModule, {
      logger: false,
    });
    const table = app.get(RouteTable);
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(MultiRouter);

    // Two routes for the one method: one per stacked decorator.
    expect(table.ofType('message')).toHaveLength(1);
    expect(table.ofType('callback_query')).toHaveLength(1);

    await dispatcher.dispatch(messageUpdate(1, 'hi'));
    expect(router.hits).toEqual(['hit']);

    await app.close();
  });
});

// Parameter decorators resolve through ECC: the undecorated event (auto-@Event)
// and @Sender/@Args coexist on one handler.
@Router()
class ParamsRouter {
  seen?: { text?: string; userId?: number; args: string[] };

  @Command('echo')
  echo(
    message: RawUpdate['message'],
    @Sender() user: User,
    @Args() args: string[],
  ): void {
    this.seen = { text: message?.text, userId: user?.id, args };
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: 'TEST' })],
  providers: [ParamsRouter],
})
class ParamsAppModule {}

describe('parameter decorators (integration)', () => {
  it('resolves the auto-@Event first param alongside @Sender and @Args', async () => {
    const app = await NestFactory.createApplicationContext(ParamsAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(ParamsRouter);

    await dispatcher.dispatch(messageUpdate(1, '/echo a b'));

    expect(router.seen).toEqual({
      text: '/echo a b',
      userId: 7,
      args: ['a', 'b'],
    });

    await app.close();
  });
});

@Module({ imports: [NestgramModule.forRoot({ token: '' })] })
class EmptyTokenAppModule {}

@Module({ imports: [NestgramModule.forRoot({ token: 'not-a-token' })] })
class MalformedTokenAppModule {}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:VALID',
      webhook: { url: 'https://bot.example/tg' },
    }),
  ],
})
class InsecureWebhookAppModule {}

describe('production baseline', () => {
  it('throws at boot when the token is missing', async () => {
    await expect(
      NestFactory.createApplicationContext(EmptyTokenAppModule, {
        logger: false,
      }),
    ).rejects.toThrow(/token is required/);
  });

  it('warns when the token is malformed', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const app = await NestFactory.createApplicationContext(
      MalformedTokenAppModule,
      { logger: false },
    );

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Telegram token'),
    );

    await app.close();
    warn.mockRestore();
  });

  it('warns when a webhook is configured without a secretToken', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    const app = await NestFactory.createApplicationContext(
      InsecureWebhookAppModule,
      { logger: false },
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('secretToken'));

    await app.close();
    warn.mockRestore();
  });
});

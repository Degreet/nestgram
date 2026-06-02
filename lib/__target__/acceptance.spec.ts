/**
 * Phase 1 acceptance — the public API exercised end to end through a booted
 * Nest application context, the way a bot author uses it. Complements the
 * focused unit specs; this proves the pieces work together via discovery + ECC.
 *
 * No network: handlers record what they saw instead of replying, auto-answer is
 * disabled so callback handling never calls the API, and BotService is never hit.
 */
import {
  CanActivate,
  Catch,
  ExceptionFilter,
  Injectable,
  Module,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';

import {
  Action,
  CallbackData,
  CallbackQuery,
  Command,
  Hears,
  Message,
  NestgramModule,
  OnMessage,
  RouteTable,
  Router,
  Sender,
  UpdateDispatcher,
  User,
} from '..';
import { RawUpdate } from '../events/raw-update.types';

@Injectable()
class CounterService {
  starts = 0;
}

@Router()
class AcceptanceRouter {
  readonly log: string[] = [];

  constructor(private readonly counter: CounterService) {}

  @Command('start')
  start(message: Message, @Sender() user: User) {
    this.counter.starts += 1;
    this.log.push(`start sender=${user.first_name} text=${message.text}`);
  }

  @Hears('ping')
  hears() {
    this.log.push('hears');
  }

  @Action('refresh')
  refresh(query: CallbackQuery, @CallbackData() data?: string) {
    this.log.push(
      `action event=${query instanceof CallbackQuery} data=${data}`,
    );
  }

  @OnMessage()
  echo(message: Message) {
    this.log.push(`echo ${message.text}`);
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
    }),
  ],
  providers: [AcceptanceRouter, CounterService],
})
class AcceptanceAppModule {}

function messageUpdate(id: number, text: string): RawUpdate {
  return {
    update_id: id,
    message: {
      message_id: id,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Alice' },
      text,
    },
  };
}

function callbackUpdate(id: number, data: string): RawUpdate {
  return {
    update_id: id,
    callback_query: {
      id: `cb${id}`,
      from: { id: 7, is_bot: false, first_name: 'Alice' },
      chat_instance: 'x',
      data,
    },
  };
}

describe('Phase 1 acceptance (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;
  let router: AcceptanceRouter;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(AcceptanceAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
    router = app.get(AcceptanceRouter);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    router.log.length = 0;
  });

  it('discovers @Router providers into the route table — no routers list', () => {
    // 4 listeners across one discovered router (start, hears, refresh, echo).
    expect(app.get(RouteTable).size).toBe(4);
  });

  it('@Command matches /start (with or without args) and injects @Sender', async () => {
    await dispatcher.dispatch(messageUpdate(1, '/start now'));
    expect(router.log).toEqual(['start sender=Alice text=/start now']);
  });

  it('routes plain text to @OnMessage, not @Command', async () => {
    await dispatcher.dispatch(messageUpdate(2, 'just text'));
    expect(router.log).toEqual(['echo just text']);
  });

  it('@Hears wins over @OnMessage for matching text (first match)', async () => {
    await dispatcher.dispatch(messageUpdate(3, 'ping'));
    expect(router.log).toEqual(['hears']);
  });

  it('@Action matches callback data, with a typed event and @CallbackData', async () => {
    await dispatcher.dispatch(callbackUpdate(4, 'refresh'));
    expect(router.log).toEqual(['action event=true data=refresh']);
  });

  it('injects a constructor-provided service into a router', async () => {
    const before = app.get(CounterService).starts;
    await dispatcher.dispatch(messageUpdate(5, '/start'));
    expect(app.get(CounterService).starts).toBe(before + 1);
  });
});

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(): boolean {
    return false;
  }
}

@Injectable()
class AllowGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

@Catch()
class RecordingFilter implements ExceptionFilter {
  catch(error: Error): void {
    PipelineRouter.events.push(`caught:${error.message}`);
  }
}

@Router()
class PipelineRouter {
  static events: string[] = [];

  @UseGuards(AllowGuard)
  @Command('allow')
  allow() {
    PipelineRouter.events.push('allow-ran');
  }

  @UseGuards(DenyGuard)
  @Command('deny')
  deny() {
    PipelineRouter.events.push('deny-ran');
  }

  @UseFilters(RecordingFilter)
  @Command('boom')
  boom() {
    throw new Error('kaboom');
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: '123456:TEST' })],
  providers: [PipelineRouter],
})
class PipelineAppModule {}

describe('Nest pipeline via ECC (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(PipelineAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    PipelineRouter.events.length = 0;
  });

  it('@UseGuards runs the handler when the guard allows', async () => {
    await dispatcher.dispatch(messageUpdate(1, '/allow'));
    expect(PipelineRouter.events).toEqual(['allow-ran']);
  });

  it('@UseGuards blocks the handler when the guard denies', async () => {
    // Control: /allow above proves the route matches and the pipeline runs, so
    // an empty log here is attributable to the guard, not a wiring failure.
    await dispatcher.dispatch(messageUpdate(2, '/deny'));
    expect(PipelineRouter.events).toEqual([]);
  });

  it('@UseFilters catches an error thrown inside a handler', async () => {
    await dispatcher.dispatch(messageUpdate(3, '/boom'));
    expect(PipelineRouter.events).toEqual(['caught:kaboom']);
  });
});

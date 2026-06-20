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
  ExecutionContext,
  Injectable,
  Logger,
  Module,
  ParseIntPipe,
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
  EventState,
  Hears,
  Message,
  NestgramModule,
  OnMessage,
  OnStart,
  OnUnhandled,
  Param,
  RouteTable,
  Router,
  Sender,
  State,
  TelegramExecutionContext,
  UpdateDispatcher,
  User,
} from '..';
import { RawUpdate } from '../events/raw-update.types';
import { NOOP_CALLBACK_DATA } from '../keyboards/noop.constants';

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
      date: 1,
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
    // 4 listeners across one discovered router (start, hears, refresh, echo),
    // plus the built-in routes: no-op (1), checkbox toggle + clear (2), pagination
    // nav (2: pagego + pageat).
    expect(app.get(RouteTable).size).toBe(9);
  });

  it('@Command matches a bare /start (exact arity) and injects @Sender', async () => {
    await dispatcher.dispatch(messageUpdate(1, '/start'));
    expect(router.log).toEqual(['start sender=Alice text=/start']);
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

@Injectable()
class StampGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    TelegramExecutionContext.of(context).state.set('stamp', 'from-guard');
    return true;
  }
}

@Router()
class StateRouter {
  seen?: unknown;

  @UseGuards(StampGuard)
  @OnMessage()
  handle(_message: Message, @State() state: EventState) {
    this.seen = state.get('stamp');
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: '123456:TEST' })],
  providers: [StateRouter],
})
class StateAppModule {}

describe('per-update ctx.state (booted app)', () => {
  it('shares state a guard writes with the handler (via @State)', async () => {
    const app = await NestFactory.createApplicationContext(StateAppModule, {
      logger: false,
    });
    const dispatcher = app.get(UpdateDispatcher);
    const router = app.get(StateRouter);

    await dispatcher.dispatch(messageUpdate(1, 'hi'));

    expect(router.seen).toBe('from-guard');
    await app.close();
  });
});

@Router()
class TypedCallbackRouter {
  readonly log: string[] = [];

  @Action('buy/:productId')
  buy(
    _query: CallbackQuery,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    this.log.push(`buy product=${productId} type=${typeof productId}`);
  }

  // Two routes deliberately match the same wire value `dup/42` but capture under
  // different names. First-match wins (dupNumber); `@Param` must read the
  // WINNER's own `:n` segment, never the sibling's `:m`.
  @Action('dup/:n')
  dupNumber(_query: CallbackQuery, @Param('n', ParseIntPipe) n: number) {
    this.log.push(`dup n=${n} type=${typeof n}`);
  }

  @Action('dup/:m')
  dupString(_query: CallbackQuery, @Param('m') m: string) {
    this.log.push(`dupString m=${m} type=${typeof m}`);
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
    }),
  ],
  providers: [TypedCallbackRouter],
})
class TypedCallbackAppModule {}

describe('typed callback routes (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;
  let router: TypedCallbackRouter;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(TypedCallbackAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
    router = app.get(TypedCallbackRouter);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    router.log.length = 0;
  });

  it('injects @Param() with the pipe-decoded typed value', async () => {
    await dispatcher.dispatch(callbackUpdate(1, 'buy/42'));
    expect(router.log).toEqual(['buy product=42 type=number']);
  });

  it('reads @Param() from the winning route, never a sibling', async () => {
    await dispatcher.dispatch(callbackUpdate(2, 'dup/42'));
    // First-match wins (dupNumber); `@Param` reads its own `:n` segment as a
    // number, not the sibling dupString's `:m`.
    expect(router.log).toEqual(['dup n=42 type=number']);
  });
});

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

@Router()
class StartRouter {
  readonly log: string[] = [];

  // A typed deep link: /start ref_42 → userId 42. Declared first; exact-arity
  // keeps it disjoint from the looser routes below.
  @OnStart('ref_:userId')
  withRef(_message: Message, @Param('userId', ParseIntPipe) userId: number) {
    this.log.push(`ref ${userId}`);
  }

  // Any other single-token payload (/start other_1).
  @OnStart(':payload')
  withPayload(_message: Message, @Param('payload') payload: string) {
    this.log.push(`payload ${payload}`);
  }

  // A bare /start, no payload — never swallows the deep links above.
  @OnStart()
  plain() {
    this.log.push('plain');
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: '123456:TEST' })],
  providers: [StartRouter],
})
class StartAppModule {}

describe('@OnStart routes /start by deep-link payload (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;
  let router: StartRouter;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(StartAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
    router = app.get(StartRouter);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    router.log.length = 0;
  });

  it('routes a typed deep link to the prefixed route, decoding the param', async () => {
    await dispatcher.dispatch(messageUpdate(1, '/start ref_42'));
    expect(router.log).toEqual(['ref 42']);
  });

  it('routes a bare /start to the no-payload route', async () => {
    await dispatcher.dispatch(messageUpdate(2, '/start'));
    expect(router.log).toEqual(['plain']);
  });

  it('routes any other payload to the single-token route', async () => {
    await dispatcher.dispatch(messageUpdate(3, '/start other_1'));
    expect(router.log).toEqual(['payload other_1']);
  });
});

@Router()
class UnhandledRouter {
  readonly seen: number[] = [];

  @Action('ping')
  ping(query: CallbackQuery) {
    return query.answer();
  }

  @OnUnhandled()
  fallback(update: RawUpdate) {
    this.seen.push(update.update_id);
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
    }),
  ],
  providers: [UnhandledRouter],
})
class UnhandledAppModule {}

describe('@OnUnhandled (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;
  let router: UnhandledRouter;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(UnhandledAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
    router = app.get(UnhandledRouter);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    router.seen.length = 0;
  });

  it('runs the handler with the raw update when nothing matched', async () => {
    await dispatcher.dispatch(callbackUpdate(1, 'no-such-route'));
    expect(router.seen).toEqual([1]);
  });

  it('does not run it when a route matched', async () => {
    await dispatcher.dispatch(callbackUpdate(2, 'ping'));
    expect(router.seen).toEqual([]);
  });

  it('warns about a dead button via the built-in @OnUnhandled', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await dispatcher.dispatch(callbackUpdate(3, 'no-such-route'));
    expect(
      warn.mock.calls.some((call) => String(call[0]).includes('no-such-route')),
    ).toBe(true);
    warn.mockRestore();
  });

  it('does not warn for a built-in no-op button — it is a handled route', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await dispatcher.dispatch(callbackUpdate(4, NOOP_CALLBACK_DATA));
    expect(
      warn.mock.calls.some((call) =>
        String(call[0]).includes(NOOP_CALLBACK_DATA),
      ),
    ).toBe(false);
    expect(router.seen).toEqual([]); // matched the noop route, never @OnUnhandled
    warn.mockRestore();
  });
});

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
      warnUnhandledCallbacks: false,
    }),
  ],
})
class SilentUnhandledAppModule {}

describe('warnUnhandledCallbacks: false (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(SilentUnhandledAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
  });

  afterAll(async () => {
    await app.close();
  });

  it('silences the dead-button warning', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    await dispatcher.dispatch(callbackUpdate(1, 'dead'));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

@Router()
class ThrowingUnhandledRouter {
  @OnUnhandled()
  boom(): void {
    throw new Error('boom');
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
    }),
  ],
  providers: [ThrowingUnhandledRouter],
})
class ThrowingUnhandledAppModule {}

describe('@OnUnhandled isolation (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(
      ThrowingUnhandledAppModule,
      { logger: false },
    );
    dispatcher = app.get(UpdateDispatcher);
  });

  afterAll(async () => {
    await app.close();
  });

  it('isolates a throwing handler so the built-in warner still runs', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    await dispatcher.dispatch(callbackUpdate(1, 'still-dead'));

    // The throwing handler was caught and logged, and the built-in warner —
    // another @OnUnhandled — still ran rather than being starved.
    expect(error).toHaveBeenCalled();
    expect(
      warn.mock.calls.some((call) => String(call[0]).includes('still-dead')),
    ).toBe(true);

    warn.mockRestore();
    error.mockRestore();
  });
});

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
  callbackData,
  Command,
  Data,
  deepLinkData,
  EventState,
  Hears,
  Message,
  NestgramModule,
  OnMessage,
  RouteTable,
  Router,
  Sender,
  StartPayload,
  State,
  TelegramExecutionContext,
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

const Buy = callbackData('buy', { productId: Number });
// Two definitions deliberately share a prefix but differ in schema. They both
// match `dup:42`; first-match routing must decode with the WINNER's own
// definition, never a sibling route the matcher merely evaluated.
const DupNumber = callbackData('dup', { n: Number });
const DupString = callbackData('dup', { n: String });

@Router()
class TypedCallbackRouter {
  readonly log: string[] = [];

  @Action(Buy.filter())
  buy(_query: CallbackQuery, @Data() data: { productId: number }) {
    this.log.push(
      `buy product=${data.productId} type=${typeof data.productId}`,
    );
  }

  @Action(DupNumber.filter())
  dupNumber(_query: CallbackQuery, @Data() data: { n: number }) {
    this.log.push(`dup n=${data.n} type=${typeof data.n}`);
  }

  @Action(DupString.filter())
  dupString(_query: CallbackQuery, @Data() data: { n: string }) {
    this.log.push(`dupString n=${data.n} type=${typeof data.n}`);
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

describe('typed callback data (booted app)', () => {
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

  it('matches filter() and injects @Data() with the typed values', async () => {
    await dispatcher.dispatch(callbackUpdate(1, Buy.pack({ productId: 42 })));
    expect(router.log).toEqual(['buy product=42 type=number']);
  });

  it('decodes @Data() with the winning route definition, never a sibling', async () => {
    await dispatcher.dispatch(callbackUpdate(2, 'dup:42'));
    // First-match wins (dupNumber), and it decodes `42` as a number with its
    // own schema — not the String schema of the overlapping dupString route.
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

const StartRef = deepLinkData('ref', { userId: Number });

@Router()
class StartPayloadRouter {
  seen: unknown = 'unset';

  @Command('start')
  start(
    _message: Message,
    @StartPayload(StartRef) data: { userId: number } | null,
  ) {
    this.seen = data;
  }
}

@Module({
  imports: [NestgramModule.forRoot({ token: '123456:TEST' })],
  providers: [StartPayloadRouter],
})
class StartPayloadAppModule {}

describe('@StartPayload deep-link data (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;
  let router: StartPayloadRouter;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(StartPayloadAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
    router = app.get(StartPayloadRouter);
  });

  afterAll(async () => {
    await app.close();
  });

  it('decodes the /start payload with the definition', async () => {
    await dispatcher.dispatch(
      messageUpdate(1, `/start ${StartRef.pack({ userId: 42 })}`),
    );
    expect(router.seen).toEqual({ userId: 42 });
  });

  it('is null when /start carries no payload', async () => {
    await dispatcher.dispatch(messageUpdate(2, '/start'));
    expect(router.seen).toBeNull();
  });

  it('is null when the payload is a different definition', async () => {
    await dispatcher.dispatch(messageUpdate(3, '/start other_1'));
    expect(router.seen).toBeNull();
  });
});

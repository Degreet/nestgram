/**
 * Command routing (#34) end to end through a booted app and the real
 * `ExternalContextCreator` pipeline.
 *
 * Proves what a bot author relies on:
 *   1. `@Command('add :amount :note...')` + `@Param` inject the captured, typed
 *      arguments (a pipe decodes the segment — `ParseIntPipe` → `number`).
 *   2. Exact-arity routing selects disjoint handlers by the message's shape
 *      (arity overloading), and a bare command matches only with no arguments.
 *   3. A per-parameter pipe runs through the pipeline, so a bad value throws and
 *      the handler's exception filter catches it.
 *
 * No network: handlers record what they saw; BotService is never hit.
 */
import {
  Catch,
  ExceptionFilter,
  Module,
  ParseIntPipe,
  UseFilters,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';

import {
  Args,
  Command,
  Message,
  NestgramModule,
  Param,
  Router,
  UpdateDispatcher,
} from '..';
import { RawUpdate } from '../events/raw-update.types';

@Catch()
class RecordingFilter implements ExceptionFilter {
  catch(error: Error): void {
    CommandsRouter.errors.push(error.constructor.name);
  }
}

@Router()
class CommandsRouter {
  static added: { amount: number; note: string }[] = [];
  static raw: string[][] = [];
  static pinged = 0;
  static errors: string[] = [];

  // Two-argument form: the greedy :note... keeps the trailing free text intact.
  @Command('add :amount :note...')
  add(
    message: Message,
    @Param('amount', ParseIntPipe) amount: number,
    @Param('note') note: string,
  ) {
    CommandsRouter.added.push({ amount, note });
  }

  // One-argument form — disjoint from the two-argument route by exact arity.
  @Command('add :amount')
  addBare(message: Message, @Param('amount', ParseIntPipe) amount: number) {
    CommandsRouter.added.push({ amount, note: '' });
  }

  // A bare command matches only `/ping` (no arguments).
  @Command('ping')
  ping() {
    CommandsRouter.pinged += 1;
  }

  // Raw token list via @Args(), independent of named segments.
  @Command('echo :rest...')
  echo(message: Message, @Args() args: string[]) {
    CommandsRouter.raw.push(args);
  }

  // A per-parameter pipe rejects a non-numeric value; the filter records it.
  @UseFilters(RecordingFilter)
  @Command('buy :id')
  buy(message: Message, @Param('id', ParseIntPipe) id: number) {
    CommandsRouter.added.push({ amount: id, note: 'bought' });
  }
}

@Module({
  imports: [
    NestgramModule.forRoot({
      token: '123456:TEST',
      autoAnswerCallbackQueries: false,
    }),
  ],
  providers: [CommandsRouter],
})
class CommandsAppModule {}

function command(id: number, text: string): RawUpdate {
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

describe('command routing (booted app)', () => {
  let app: INestApplicationContext;
  let dispatcher: UpdateDispatcher;

  beforeAll(async () => {
    app = await NestFactory.createApplicationContext(CommandsAppModule, {
      logger: false,
    });
    dispatcher = app.get(UpdateDispatcher);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    CommandsRouter.added.length = 0;
    CommandsRouter.raw.length = 0;
    CommandsRouter.errors.length = 0;
    CommandsRouter.pinged = 0;
  });

  it('@Param injects captured, pipe-decoded arguments', async () => {
    await dispatcher.dispatch(command(1, '/add 42 buy oat milk'));
    expect(CommandsRouter.added).toEqual([
      { amount: 42, note: 'buy oat milk' },
    ]);
  });

  it('selects the disjoint one-argument handler by arity', async () => {
    await dispatcher.dispatch(command(2, '/add 7'));
    expect(CommandsRouter.added).toEqual([{ amount: 7, note: '' }]);
  });

  it('a bare command matches only with no arguments', async () => {
    await dispatcher.dispatch(command(3, '/ping'));
    await dispatcher.dispatch(command(4, '/ping now'));
    expect(CommandsRouter.pinged).toBe(1);
  });

  it('@Args() gives the raw token list', async () => {
    await dispatcher.dispatch(command(5, '/echo a b c'));
    expect(CommandsRouter.raw).toEqual([['a', 'b', 'c']]);
  });

  it('a per-parameter pipe rejects a bad value; the filter catches the throw', async () => {
    await dispatcher.dispatch(command(6, '/buy nope'));
    expect(CommandsRouter.added).toHaveLength(0);
    expect(CommandsRouter.errors).toEqual(['BadRequestException']);
  });
});

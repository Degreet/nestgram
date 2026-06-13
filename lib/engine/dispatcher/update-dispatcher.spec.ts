import { ContextFactory, EventFactory } from '../context';
import { HandlerExecutorFactory, ResultHandler } from '../execution';
import { RouteMatcher, RouteTable } from '../discovery';
import { Route } from '../discovery/route.types';
import { RoutePredicate } from '../matching';
import { RawUpdate } from '../../events/raw-update.types';
import { BotService } from '../../api';
import { StageRegistry } from './stage-registry';
import { UpdateStage } from './update-stage';
import { UpdateDispatcher } from './update-dispatcher';

function fakeBot(): BotService {
  return { token: 'TEST' } as unknown as BotService;
}

function messageUpdate(update_id: number, text: string): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Alice' },
      text,
    },
  };
}

/** A stage that records its apply/commit into the shared call log, for ordering. */
function recordingStage(calls: string[]): UpdateStage {
  return {
    apply: () => {
      calls.push('apply');
    },
    commit: () => {
      calls.push('commit');
    },
  };
}

/**
 * Build a dispatcher whose executor factory returns scripted invokers per route,
 * so the wrap → stages → match → invoke → result flow can be driven without
 * ECC/Nest. `calls` records what ran (stage apply/commit + route methods), in order.
 */
function makeDispatcher(
  routes: Route[],
  stagesFor: (calls: string[]) => UpdateStage[] = () => [],
) {
  const calls: string[] = [];
  const contextFactory = new ContextFactory(fakeBot(), new EventFactory());
  const table = new RouteTable(routes);

  const executorFactory = {
    create: (_instance: object, methodName: string) => () => {
      calls.push(methodName);
      return Promise.resolve(`reply from ${methodName}`);
    },
  } as unknown as HandlerExecutorFactory;

  const handled: unknown[] = [];
  const resultHandler = {
    handle: (result: unknown) => {
      handled.push(result);
      return Promise.resolve();
    },
  } as unknown as ResultHandler;

  const dispatcher = new UpdateDispatcher(
    contextFactory,
    table,
    new RouteMatcher(),
    executorFactory,
    resultHandler,
    new StageRegistry(stagesFor(calls)),
  );
  return { dispatcher, calls, handled };
}

function route(
  updateType: string,
  methodName: string,
  predicates: RoutePredicate[] = [],
): Route {
  return { updateType, predicates, instance: {}, methodName };
}

const deny: RoutePredicate = { matches: () => false };

describe('UpdateDispatcher', () => {
  it('invokes the handler and passes its result to the result handler', async () => {
    const { dispatcher, calls, handled } = makeDispatcher([
      route('message', 'start'),
    ]);

    await dispatcher.dispatch(messageUpdate(1, '/start'));

    expect(calls).toEqual(['start']);
    expect(handled).toEqual(['reply from start']);
  });

  it('threads the given bot into the context, falling back to the default', async () => {
    let seenBot: BotService | undefined;
    const contextFactory = new ContextFactory(fakeBot(), new EventFactory());
    const executorFactory = {
      create: () => (ctx: { bot: BotService }) => {
        seenBot = ctx.bot;
        return Promise.resolve(undefined);
      },
    } as unknown as HandlerExecutorFactory;
    const resultHandler = {
      handle: () => Promise.resolve(),
    } as unknown as ResultHandler;
    const dispatcher = new UpdateDispatcher(
      contextFactory,
      new RouteTable([route('message', 'h')]),
      new RouteMatcher(),
      executorFactory,
      resultHandler,
      new StageRegistry(),
    );

    const botB = { token: 'BOT_B' } as unknown as BotService;
    await dispatcher.dispatch(messageUpdate(1, 'hi'), botB);
    expect(seenBot).toBe(botB);

    // Omitted → the ContextFactory's injected default (token 'TEST').
    await dispatcher.dispatch(messageUpdate(2, 'hi'));
    expect(seenBot?.token).toBe('TEST');
  });

  it('runs only the first matching route (first-match)', async () => {
    const { dispatcher, calls } = makeDispatcher([
      route('message', 'first'),
      route('message', 'second'),
    ]);

    await dispatcher.dispatch(messageUpdate(1, 'hi'));

    expect(calls).toEqual(['first']);
  });

  it('skips routes whose filters reject and takes the next match', async () => {
    const { dispatcher, calls } = makeDispatcher([
      route('message', 'filtered', [deny]),
      route('message', 'fallback'),
    ]);

    await dispatcher.dispatch(messageUpdate(1, 'hi'));

    expect(calls).toEqual(['fallback']);
  });

  it('does nothing when no route matches', async () => {
    const { dispatcher, calls, handled } = makeDispatcher([
      route('callback_query', 'cb'),
    ]);

    await dispatcher.dispatch(messageUpdate(1, 'hi'));

    expect(calls).toEqual([]);
    expect(handled).toEqual([]);
  });

  it('ignores updates of an unrecognised kind', async () => {
    const { dispatcher, calls } = makeDispatcher([route('message', 'm')]);

    await dispatcher.dispatch({ update_id: 1 } as RawUpdate);

    expect(calls).toEqual([]);
  });

  it('isolates failures: a throwing handler does not propagate', async () => {
    const contextFactory = new ContextFactory(fakeBot(), new EventFactory());
    const table = new RouteTable([route('message', 'boom')]);
    const executorFactory = {
      create: () => () => Promise.reject(new Error('handler blew up')),
    } as unknown as HandlerExecutorFactory;
    const resultHandler = {
      handle: () => Promise.resolve(),
    } as unknown as ResultHandler;

    const dispatcher = new UpdateDispatcher(
      contextFactory,
      table,
      new RouteMatcher(),
      executorFactory,
      resultHandler,
      new StageRegistry(),
    );

    await expect(
      dispatcher.dispatch(messageUpdate(1, 'hi')),
    ).resolves.toBeUndefined();
  });

  it('builds an invoker once per route and caches it', async () => {
    const calls: string[] = [];
    const contextFactory = new ContextFactory(fakeBot(), new EventFactory());
    const r = route('message', 'start');
    const table = new RouteTable([r]);
    let creates = 0;
    const executorFactory = {
      create: () => {
        creates++;
        return () => {
          calls.push('run');
          return Promise.resolve(undefined);
        };
      },
    } as unknown as HandlerExecutorFactory;
    const resultHandler = {
      handle: () => Promise.resolve(),
    } as unknown as ResultHandler;

    const dispatcher = new UpdateDispatcher(
      contextFactory,
      table,
      new RouteMatcher(),
      executorFactory,
      resultHandler,
      new StageRegistry(),
    );

    await dispatcher.dispatch(messageUpdate(1, 'a'));
    await dispatcher.dispatch(messageUpdate(2, 'b'));

    expect(creates).toBe(1);
    expect(calls).toEqual(['run', 'run']);
  });

  it('applies stages before matching and commits after a successful handler', async () => {
    const { dispatcher, calls } = makeDispatcher(
      [route('message', 'start')],
      (log) => [recordingStage(log)],
    );

    await dispatcher.dispatch(messageUpdate(1, '/start'));

    expect(calls).toEqual(['apply', 'start', 'commit']);
  });

  it('applies stages but skips commit when no route matches', async () => {
    const { dispatcher, calls } = makeDispatcher(
      [route('callback_query', 'cb')],
      (log) => [recordingStage(log)],
    );

    await dispatcher.dispatch(messageUpdate(1, 'hi'));

    expect(calls).toEqual(['apply']);
  });

  it('skips commit when the handler throws', async () => {
    const calls: string[] = [];
    const contextFactory = new ContextFactory(fakeBot(), new EventFactory());
    const table = new RouteTable([route('message', 'boom')]);
    const executorFactory = {
      create: () => () => Promise.reject(new Error('blew up')),
    } as unknown as HandlerExecutorFactory;
    const resultHandler = {
      handle: () => Promise.resolve(),
    } as unknown as ResultHandler;

    const dispatcher = new UpdateDispatcher(
      contextFactory,
      table,
      new RouteMatcher(),
      executorFactory,
      resultHandler,
      new StageRegistry([recordingStage(calls)]),
    );

    await dispatcher.dispatch(messageUpdate(1, 'hi'));

    expect(calls).toEqual(['apply']);
  });
});

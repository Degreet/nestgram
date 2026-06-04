import { ContextFactory, EventFactory } from '../context';
import { HandlerExecutorFactory, ResultHandler } from '../execution';
import { RouteMatcher, RouteTable } from '../discovery';
import { Route } from '../discovery/route.types';
import { RoutePredicate } from '../matching';
import { RawUpdate } from '../../events/raw-update.types';
import { BotService } from '../../api';
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

/**
 * Build a dispatcher whose executor factory returns scripted invokers per route,
 * so the wrap → match → invoke → result flow can be driven without ECC/Nest.
 * `calls` records which route methods ran, in order.
 */
function makeDispatcher(routes: Route[]) {
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
    );

    await dispatcher.dispatch(messageUpdate(1, 'a'));
    await dispatcher.dispatch(messageUpdate(2, 'b'));

    expect(creates).toBe(1);
    expect(calls).toEqual(['run', 'run']);
  });
});

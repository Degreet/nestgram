import { TelegramExecutionContext } from '../context';
import { NestgramFilter } from '../types';
import { findMatches, matchesRoute } from './route-matcher';
import { Route } from './route.types';
import { RouteTable } from './route-table';

function ctxOf(kind: string, event: unknown = {}): TelegramExecutionContext {
  return { kind, event } as unknown as TelegramExecutionContext;
}

function route(
  updateType: string,
  methodName: string,
  filters: NestgramFilter[] = [],
): Route {
  return { updateType, filters, instance: {}, methodName };
}

const allow: NestgramFilter = { canActivate: () => true };
const deny: NestgramFilter = { canActivate: () => false };
const allowAsync: NestgramFilter = {
  canActivate: () => Promise.resolve(true),
};

describe('matchesRoute', () => {
  it('matches on update type with no filters', async () => {
    expect(await matchesRoute(route('message', 'm'), ctxOf('message'))).toBe(
      true,
    );
  });

  it('rejects when the update type differs', async () => {
    expect(
      await matchesRoute(route('message', 'm'), ctxOf('callback_query')),
    ).toBe(false);
  });

  it('requires every filter to pass', async () => {
    expect(
      await matchesRoute(
        route('message', 'm', [allow, deny]),
        ctxOf('message'),
      ),
    ).toBe(false);
    expect(
      await matchesRoute(
        route('message', 'm', [allow, allowAsync]),
        ctxOf('message'),
      ),
    ).toBe(true);
  });

  it('awaits async filters', async () => {
    expect(
      await matchesRoute(route('message', 'm', [allowAsync]), ctxOf('message')),
    ).toBe(true);
  });

  it('passes the rich event to the filter', async () => {
    const seen: unknown[] = [];
    const spy: NestgramFilter = {
      canActivate: (event) => {
        seen.push(event);
        return true;
      },
    };
    const event = { id: 1 };
    await matchesRoute(route('message', 'm', [spy]), ctxOf('message', event));
    expect(seen).toEqual([event]);
  });

  it('short-circuits: does not call later filters after a rejection', async () => {
    let laterCalled = false;
    const later: NestgramFilter = {
      canActivate: () => {
        laterCalled = true;
        return true;
      },
    };
    await matchesRoute(route('message', 'm', [deny, later]), ctxOf('message'));
    expect(laterCalled).toBe(false);
  });
});

describe('findMatches', () => {
  it('returns every match in declaration order', async () => {
    const table = new RouteTable([
      route('message', 'first'),
      route('message', 'second'),
      route('callback_query', 'other'),
    ]);

    const matches = await findMatches(table, ctxOf('message'));
    expect(matches.map((r) => r.methodName)).toEqual(['first', 'second']);
  });

  it('only walks candidates of the update kind', async () => {
    const table = new RouteTable([
      route('message', 'm', [deny]),
      route('callback_query', 'c'),
    ]);

    expect(await findMatches(table, ctxOf('callback_query'))).toHaveLength(1);
  });

  it('is empty when nothing matches', async () => {
    const table = new RouteTable([route('message', 'm', [deny])]);
    expect(await findMatches(table, ctxOf('message'))).toEqual([]);
  });
});

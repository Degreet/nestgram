import { TelegramExecutionContext } from '../context';
import { RoutePredicate } from '../matching';
import { RouteMatcher } from './route-matcher';
import { Route } from './route.types';
import { RouteTable } from './route-table';

function ctxOf(kind: string, event: unknown = {}): TelegramExecutionContext {
  return { kind, event } as unknown as TelegramExecutionContext;
}

function route(
  updateType: string,
  methodName: string,
  predicates: RoutePredicate[] = [],
): Route {
  return { updateType, predicates, instance: {}, methodName };
}

function tableOf(...routes: Route[]): RouteTable {
  return new RouteTable(routes);
}

const allow: RoutePredicate = { matches: () => true };
const deny: RoutePredicate = { matches: () => false };
const allowAsync: RoutePredicate = {
  matches: () => Promise.resolve(true),
};

describe('RouteMatcher', () => {
  const matcher = new RouteMatcher();

  describe('single-route matching', () => {
    it('matches on update type with no predicates', async () => {
      const matches = await matcher.findMatches(
        tableOf(route('message', 'm')),
        ctxOf('message'),
      );
      expect(matches.map((r) => r.methodName)).toEqual(['m']);
    });

    it('rejects when the update type differs', async () => {
      const matches = await matcher.findMatches(
        tableOf(route('message', 'm')),
        ctxOf('callback_query'),
      );
      expect(matches).toEqual([]);
    });

    it('requires every predicate to pass', async () => {
      const denied = await matcher.findMatches(
        tableOf(route('message', 'm', [allow, deny])),
        ctxOf('message'),
      );
      expect(denied).toEqual([]);

      const allowed = await matcher.findMatches(
        tableOf(route('message', 'm', [allow, allowAsync])),
        ctxOf('message'),
      );
      expect(allowed).toHaveLength(1);
    });

    it('awaits async predicates', async () => {
      const matches = await matcher.findMatches(
        tableOf(route('message', 'm', [allowAsync])),
        ctxOf('message'),
      );
      expect(matches).toHaveLength(1);
    });

    it('passes the execution context to the predicate', async () => {
      const seen: unknown[] = [];
      const spy: RoutePredicate = {
        matches: (ctx) => {
          seen.push(ctx.event);
          return true;
        },
      };
      const event = { id: 1 };
      await matcher.findMatches(
        tableOf(route('message', 'm', [spy])),
        ctxOf('message', event),
      );
      expect(seen).toEqual([event]);
    });

    it('short-circuits: does not call later predicates after a rejection', async () => {
      let laterCalled = false;
      const later: RoutePredicate = {
        matches: () => {
          laterCalled = true;
          return true;
        },
      };
      await matcher.findMatches(
        tableOf(route('message', 'm', [deny, later])),
        ctxOf('message'),
      );
      expect(laterCalled).toBe(false);
    });
  });

  describe('findMatches across routes', () => {
    it('returns every match in declaration order', async () => {
      const table = tableOf(
        route('message', 'first'),
        route('message', 'second'),
        route('callback_query', 'other'),
      );

      const matches = await matcher.findMatches(table, ctxOf('message'));
      expect(matches.map((r) => r.methodName)).toEqual(['first', 'second']);
    });

    it('only walks candidates of the update kind', async () => {
      const table = tableOf(
        route('message', 'm', [deny]),
        route('callback_query', 'c'),
      );

      expect(
        await matcher.findMatches(table, ctxOf('callback_query')),
      ).toHaveLength(1);
    });

    it('is empty when nothing matches', async () => {
      const table = tableOf(route('message', 'm', [deny]));
      expect(await matcher.findMatches(table, ctxOf('message'))).toEqual([]);
    });
  });
});

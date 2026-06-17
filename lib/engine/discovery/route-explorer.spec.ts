import {
  DiscoveryService as NestDiscoveryService,
  MetadataScanner,
} from '@nestjs/core';

import { Metadata } from '../../decorators/metadata.enum';
import { ListenerOptions } from '../../decorators/listener-options';
import { Match } from '../../decorators/match.decorator';
import { RoutePredicate } from '../matching';
import {
  CallbackRoutePattern,
  CallbackRoutePredicate,
} from '../../callback-data';
import type { TelegramExecutionContext } from '../context';
import { RouteExplorer } from './route-explorer';
import { RouteTable } from './route-table';

// Apply listener metadata exactly as createListenerDecorator does: an array of
// ListenerOptions on the method function. Done by hand so the test doesn't
// depend on the concrete decorator export names.
function listen(
  prototype: object,
  methodName: string,
  ...updateTypes: string[]
): void {
  const fn = (prototype as Record<string, unknown>)[methodName];
  const options: ListenerOptions[] = updateTypes.map((updateType) => ({
    updateType,
    predicates: [],
  }));
  Reflect.defineMetadata(Metadata.LISTENERS, options, fn as object);
}

class GreetRouter {
  start(): string {
    return 'start';
  }
  echo(): string {
    return 'echo';
  }
  plain(): string {
    return 'plain';
  }
}
Reflect.defineMetadata(Metadata.ROUTER, {}, GreetRouter);
listen(GreetRouter.prototype, 'start', 'message');
listen(GreetRouter.prototype, 'echo', 'callback_query');
// `plain` intentionally has no listener metadata.

class NotARouter {
  cmd(): string {
    return 'cmd';
  }
}
listen(NotARouter.prototype, 'cmd', 'message'); // listener but no @Router

function explorerOver(instances: object[]): RouteExplorer {
  const discovery = {
    getProviders: () => instances.map((instance) => ({ instance })),
  } as unknown as NestDiscoveryService;
  return new RouteExplorer(discovery, new MetadataScanner());
}

describe('RouteExplorer', () => {
  it('collects listener methods from @Router classes only', () => {
    const routes = explorerOver([
      new GreetRouter(),
      new NotARouter(),
    ]).explore();

    expect(routes).toHaveLength(2);
    expect(routes.map((r) => r.methodName).sort()).toEqual(['echo', 'start']);
  });

  it('carries the update type and owning instance', () => {
    const router = new GreetRouter();
    const start = explorerOver([router])
      .explore()
      .find((r) => r.methodName === 'start');

    expect(start?.updateType).toBe('message');
    expect(start?.instance).toBe(router);
  });

  it('ignores methods without a listener decorator', () => {
    const routes = explorerOver([new GreetRouter()]).explore();
    expect(routes.some((r) => r.methodName === 'plain')).toBe(false);
  });
});

// Apply @Match by hand to a prototype method, the way the decorator does at
// class-definition time (descriptor.value is the method function).
function applyMatch(
  prototype: object,
  methodName: string,
  ...predicates: RoutePredicate[]
): void {
  const fn = (prototype as Record<string, unknown>)[methodName];
  Match(...predicates)(prototype, methodName, {
    value: fn,
  } as PropertyDescriptor);
}

describe('RouteExplorer @Match (method-level predicates)', () => {
  const adminOnly: RoutePredicate = { matches: () => true };
  const inFlow: RoutePredicate = { matches: () => true };

  class MatchRouter {
    both(): string {
      return 'both';
    }
    orphan(): string {
      return 'orphan';
    }
    ordered(): string {
      return 'ordered';
    }
  }
  Reflect.defineMetadata(Metadata.ROUTER, {}, MatchRouter);
  // A method listening to two update types, with one method-level predicate.
  listen(MatchRouter.prototype, 'both', 'message', 'callback_query');
  applyMatch(MatchRouter.prototype, 'both', adminOnly);
  // @Match with no listener: nothing to narrow → no route at all.
  applyMatch(MatchRouter.prototype, 'orphan', adminOnly);
  // Two @Match calls accumulate; tested below for order-independence.
  listen(MatchRouter.prototype, 'ordered', 'message');
  applyMatch(MatchRouter.prototype, 'ordered', adminOnly, inFlow);

  it('ANDs a method-level predicate into every route of the method', () => {
    const routes = explorerOver([new MatchRouter()])
      .explore()
      .filter((r) => r.methodName === 'both');

    expect(routes.map((r) => r.updateType).sort()).toEqual([
      'callback_query',
      'message',
    ]);
    for (const route of routes) {
      expect(route.predicates).toContain(adminOnly);
    }
  });

  it('produces no route for @Match without a listener', () => {
    const routes = explorerOver([new MatchRouter()]).explore();
    expect(routes.some((r) => r.methodName === 'orphan')).toBe(false);
  });

  it('accumulates multiple method-level predicates onto the route', () => {
    const [route] = explorerOver([new MatchRouter()])
      .explore()
      .filter((r) => r.methodName === 'ordered');

    expect(route.predicates).toEqual(
      expect.arrayContaining([adminOnly, inFlow]),
    );
  });
});

// Attach a listener carrying a real CallbackRoutePredicate, the way @Action does.
function listenAction(
  prototype: object,
  methodName: string,
  template: string,
): void {
  const fn = (prototype as Record<string, unknown>)[methodName];
  const options: ListenerOptions[] = [
    {
      updateType: 'callback_query',
      predicates: [
        new CallbackRoutePredicate(CallbackRoutePattern.compile(template)),
      ],
    },
  ];
  Reflect.defineMetadata(Metadata.LISTENERS, options, fn as object);
}

function callbackCtx(data: string): TelegramExecutionContext {
  return {
    update: { callback_query: { data } },
  } as unknown as TelegramExecutionContext;
}

describe('RouteExplorer @Router prefix (callback-route namespacing)', () => {
  class PrefixedRouter {
    done(): string {
      return 'done';
    }
  }
  Reflect.defineMetadata(
    Metadata.ROUTER,
    { prefix: 'reminder' },
    PrefixedRouter,
  );
  listenAction(PrefixedRouter.prototype, 'done', 'done/:id');

  class PlainRouter {
    done(): string {
      return 'done';
    }
  }
  Reflect.defineMetadata(Metadata.ROUTER, {}, PlainRouter);
  listenAction(PlainRouter.prototype, 'done', 'done/:id');

  it('prefixes a prefixable listener predicate with the router prefix', () => {
    const [route] = explorerOver([new PrefixedRouter()]).explore();
    const predicate = route.predicates[0];

    expect(predicate.matches(callbackCtx('reminder/done/7'))).toBe(true);
    expect(predicate.matches(callbackCtx('done/7'))).toBe(false);
  });

  it('leaves predicates untouched when the router has no prefix', () => {
    const [route] = explorerOver([new PlainRouter()]).explore();
    const predicate = route.predicates[0];

    expect(predicate.matches(callbackCtx('done/7'))).toBe(true);
    expect(predicate.matches(callbackCtx('reminder/done/7'))).toBe(false);
  });
});

describe('RouteExplorer class-level predicates (@ForBot on a router)', () => {
  const onlyBotA: RoutePredicate = { matches: () => true };

  class ScopedRouter {
    a(): string {
      return 'a';
    }
    b(): string {
      return 'b';
    }
  }
  Reflect.defineMetadata(Metadata.ROUTER, {}, ScopedRouter);
  // Class-level MATCH, exactly as @ForBot('a') on the router stores it.
  Reflect.defineMetadata(Metadata.MATCH, [onlyBotA], ScopedRouter);
  listen(ScopedRouter.prototype, 'a', 'message');
  listen(ScopedRouter.prototype, 'b', 'callback_query');

  it('ANDs a class-level predicate into every route of the router', () => {
    const routes = explorerOver([new ScopedRouter()]).explore();

    expect(routes).toHaveLength(2);
    for (const route of routes) {
      expect(route.predicates).toContain(onlyBotA);
    }
  });
});

describe('RouteTable', () => {
  it('preserves declaration order and indexes by update type', () => {
    const table = new RouteTable(explorerOver([new GreetRouter()]).explore());

    expect(table.size).toBe(2);
    expect(table.ofType('message').map((r) => r.methodName)).toEqual(['start']);
    expect(table.ofType('callback_query').map((r) => r.methodName)).toEqual([
      'echo',
    ]);
    expect(table.ofType('inline_query')).toEqual([]);
  });
});

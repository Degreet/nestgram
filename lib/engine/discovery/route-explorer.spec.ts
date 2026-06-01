import {
  DiscoveryService as NestDiscoveryService,
  MetadataScanner,
} from '@nestjs/core';

import { Metadata } from '../../enums';
import { ListenerOptions } from '../../types';
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

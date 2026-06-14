import { DiscoveryService } from '@nestjs/core';

import { Route } from './route.types';
import { RouteTransform } from './route-transform';
import { RouteTransformExplorer } from './route-transform-explorer';

@RouteTransform()
class TagTransform implements RouteTransform {
  transform(routes: Route[]): Route[] {
    return routes;
  }
}

class NotATransform {}

function discoveryReturning(instances: object[]): DiscoveryService {
  return {
    getProviders: () => instances.map((instance) => ({ instance })),
  } as unknown as DiscoveryService;
}

describe('RouteTransformExplorer', () => {
  it('collects @RouteTransform providers', () => {
    const transform = new TagTransform();
    const explorer = new RouteTransformExplorer(
      discoveryReturning([new NotATransform(), transform, {}]),
    );

    expect(explorer.explore()).toEqual([transform]);
  });

  it('returns an empty list when no transforms are present', () => {
    const explorer = new RouteTransformExplorer(
      discoveryReturning([new NotATransform()]),
    );
    expect(explorer.explore()).toEqual([]);
  });
});

import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { isRouteTransform, RouteTransform } from './route-transform';

/**
 * Collects every `@RouteTransform` provider at boot — the {@link RouteTransform}
 * counterpart of {@link StageExplorer}.
 *
 * Runs ONCE at startup, reusing Nest's own `DiscoveryService`. Returns the
 * transforms in discovery order; {@link NestgramBootstrap} folds them over the
 * freshly explored routes (each transform's output feeds the next) before the
 * route table is set.
 */
@Injectable()
export class RouteTransformExplorer {
  constructor(private readonly discovery: DiscoveryService) {}

  explore(): RouteTransform[] {
    const found: RouteTransform[] = [];

    for (const wrapper of this.discovery.getProviders()) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') {
        continue;
      }

      if (!isRouteTransform(instance.constructor)) {
        continue;
      }

      found.push(instance as RouteTransform);
    }

    return found;
  }
}

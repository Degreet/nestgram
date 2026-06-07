import { Injectable } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';

import { stageOrderOf, UpdateStage } from './update-stage';

/**
 * Builds the boot-time pipeline-stage list by scanning every provider for
 * `@UpdateStage` classes — the {@link UpdateStage} counterpart of
 * {@link RouteExplorer}.
 *
 * Runs ONCE at startup. Stages are sorted ascending by their declared `order`
 * (built-ins first, then user stages); ties keep discovery order, which `sort`
 * preserves. Discovery reuses Nest's own `DiscoveryService`.
 */
@Injectable()
export class StageExplorer {
  constructor(private readonly discovery: DiscoveryService) {}

  explore(): UpdateStage[] {
    const found: Array<{ order: number; stage: UpdateStage }> = [];

    for (const wrapper of this.discovery.getProviders()) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') {
        continue;
      }

      const order = stageOrderOf(instance.constructor);
      if (order === undefined) {
        continue;
      }

      found.push({ order, stage: instance as UpdateStage });
    }

    found.sort((a, b) => a.order - b.order);
    return found.map((entry) => entry.stage);
  }
}

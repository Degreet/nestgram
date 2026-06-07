import { DiscoveryService } from '@nestjs/core';

import { StageExplorer } from './stage-explorer';
import { UpdateStage } from './update-stage';

@UpdateStage({ order: 20 })
class SecondStage implements UpdateStage {
  apply(): void {
    /* noop */
  }
}

@UpdateStage({ order: 10 })
class FirstStage implements UpdateStage {
  apply(): void {
    /* noop */
  }
}

@UpdateStage()
class DefaultStage implements UpdateStage {
  apply(): void {
    /* noop */
  }
}

class NotAStage {}

function discoveryReturning(instances: object[]): DiscoveryService {
  return {
    getProviders: () => instances.map((instance) => ({ instance })),
  } as unknown as DiscoveryService;
}

describe('StageExplorer', () => {
  it('collects @UpdateStage providers, sorted ascending by order', () => {
    const first = new FirstStage();
    const second = new SecondStage();
    const fallback = new DefaultStage();

    const explorer = new StageExplorer(
      // discovery order deliberately scrambled
      discoveryReturning([second, fallback, first]),
    );

    // order 10, 20, then the default (1000)
    expect(explorer.explore()).toEqual([first, second, fallback]);
  });

  it('ignores providers that are not stages', () => {
    const first = new FirstStage();
    const explorer = new StageExplorer(
      discoveryReturning([new NotAStage(), first, {}]),
    );

    expect(explorer.explore()).toEqual([first]);
  });

  it('returns an empty list when no stages are present', () => {
    const explorer = new StageExplorer(discoveryReturning([new NotAStage()]));
    expect(explorer.explore()).toEqual([]);
  });
});

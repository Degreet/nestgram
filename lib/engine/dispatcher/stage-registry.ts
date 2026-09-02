import { Injectable, Optional } from '@nestjs/common';

import { stageKindsOf, UpdateStage } from './update-stage';

/**
 * The boot-time pipeline-stage registry — the {@link UpdateStage} counterpart of
 * {@link RouteTable}.
 *
 * Holds the discovered stages in run order. Populated once at
 * `OnApplicationBootstrap` via `set()`; the same singleton is injected (empty)
 * into the dispatcher at construction and filled before any update flows. Tests
 * can construct it pre-filled (`new StageRegistry([stage])`).
 */
@Injectable()
export class StageRegistry {
  private stages: readonly UpdateStage[] = [];

  // `@Optional()`: under DI the registry is provided empty and filled at boot;
  // Nest would otherwise try to inject the array param as a token and fail.
  constructor(@Optional() stages: UpdateStage[] = []) {
    this.set(stages);
  }

  /** Replace the registry's contents. Called once at boot, in run order. */
  set(stages: UpdateStage[]): void {
    this.stages = [...stages];
  }

  /** All stages, in run order. */
  all(): readonly UpdateStage[] {
    return this.stages;
  }

  /**
   * Every update kind the registered stages declare they consume, de-duplicated.
   *
   * A stage owns no route, so these are invisible to the route table — this is
   * what lets `allowed_updates` still ask Telegram for them.
   */
  declaredKinds(): string[] {
    const kinds = new Set<string>();
    for (const stage of this.stages) {
      for (const kind of stageKindsOf(stage.constructor)) {
        kinds.add(kind);
      }
    }
    return [...kinds];
  }

  get size(): number {
    return this.stages.length;
  }
}

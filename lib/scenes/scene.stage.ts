import { Injectable } from '@nestjs/common';

import { TelegramExecutionContext } from '../engine/context';
import {
  BuiltinStageOrder,
  UpdateStage,
} from '../engine/dispatcher/update-stage';
import { SceneService } from './scene.service';

/**
 * The built-in scene pipeline stage: loads the scene record into the ambient
 * store before matching (`apply`), so the step predicate can route on the active
 * scene+step. Runs after FSM (a scene compiles down to FSM-style state). No
 * `commit` — {@link SceneContext} writes transitions through immediately. A thin
 * adapter over {@link SceneService}; nothing privileged.
 */
@Injectable()
@UpdateStage({ order: BuiltinStageOrder.Scenes })
export class SceneStage implements UpdateStage {
  constructor(private readonly scenes: SceneService) {}

  apply(ctx: TelegramExecutionContext): Promise<void> {
    return this.scenes.load(ctx);
  }
}

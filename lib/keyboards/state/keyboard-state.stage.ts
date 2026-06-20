import { Injectable } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import {
  BuiltinStageOrder,
  UpdateStage,
} from '../../engine/dispatcher/update-stage';
import { KeyboardStateService } from './keyboard-state.service';

/**
 * The built-in keyboard-state pipeline stage: loads a message's keyboard state
 * into the ambient store before matching (`apply`) and persists it after a
 * successful handler (`commit`). A thin adapter over {@link KeyboardStateService},
 * registered by the core module so live keyboards work with no import — nothing
 * privileged, it is an ordinary `@UpdateStage` a user could have written.
 */
@Injectable()
@UpdateStage({ order: BuiltinStageOrder.KeyboardState })
export class KeyboardStateStage implements UpdateStage {
  constructor(private readonly state: KeyboardStateService) {}

  apply(ctx: TelegramExecutionContext): Promise<void> {
    return this.state.load(ctx);
  }

  commit(): Promise<void> {
    return this.state.save();
  }
}

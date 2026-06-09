import { Injectable } from '@nestjs/common';

import { TelegramExecutionContext } from '../engine/context';
import {
  BuiltinStageOrder,
  UpdateStage,
} from '../engine/dispatcher/update-stage';
import { FsmManager } from './fsm-manager';

/**
 * The built-in FSM pipeline stage: loads the FSM record into the ambient store
 * before matching (`apply`), so a `State` predicate can route on the current
 * state. No `commit` — `FsmContext` writes transitions through immediately. A
 * thin adapter over {@link FsmManager}; nothing privileged.
 */
@Injectable()
@UpdateStage({ order: BuiltinStageOrder.Fsm })
export class FsmStage implements UpdateStage {
  constructor(private readonly fsm: FsmManager) {}

  apply(ctx: TelegramExecutionContext): Promise<void> {
    return this.fsm.load(ctx);
  }
}

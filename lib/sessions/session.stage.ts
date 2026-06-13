import { Injectable } from '@nestjs/common';

import { TelegramExecutionContext } from '../engine/context';
import {
  BuiltinStageOrder,
  UpdateStage,
} from '../engine/dispatcher/update-stage';
import { SessionService } from './session.service';

/**
 * The built-in session pipeline stage: loads the session into the ambient store
 * before matching (`apply`) and persists it after a successful handler
 * (`commit`). A thin adapter over {@link SessionService} — nothing privileged.
 */
@Injectable()
@UpdateStage({ order: BuiltinStageOrder.Session })
export class SessionStage implements UpdateStage {
  constructor(private readonly sessions: SessionService) {}

  apply(ctx: TelegramExecutionContext): Promise<void> {
    return this.sessions.load(ctx);
  }

  commit(): Promise<void> {
    return this.sessions.save();
  }
}

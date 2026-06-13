import { Injectable } from '@nestjs/common';

import { TelegramExecutionContext } from '../engine/context';
import {
  BuiltinStageOrder,
  UpdateStage,
} from '../engine/dispatcher/update-stage';
import { I18nService } from './i18n.service';

/**
 * The built-in locale-resolution pipeline stage: seeds the ambient locale +
 * translator before matching, so `t()` and `@HearsKey` work. A thin adapter over
 * {@link I18nService} — nothing privileged; it registers the same way any user
 * {@link UpdateStage} would.
 */
@Injectable()
@UpdateStage({ order: BuiltinStageOrder.I18n })
export class I18nStage implements UpdateStage {
  constructor(private readonly i18n: I18nService) {}

  apply(ctx: TelegramExecutionContext): void {
    this.i18n.resolve(ctx);
  }
}

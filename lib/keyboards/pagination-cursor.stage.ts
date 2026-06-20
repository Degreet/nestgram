import { Injectable } from '@nestjs/common';

import { setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import {
  BuiltinStageOrder,
  UpdateStage,
} from '../engine/dispatcher/update-stage';
import { PAGINATION_CURSORS } from './pagination.constants';
import { readPaginationCursors } from './pagination-cursors';

/**
 * Recovers every paginated section's current page from the incoming callback's
 * markup onto the ambient rail before matching — so the builder (and the checkbox
 * router's re-render) renders each section on its page. Runs for ALL callbacks, so
 * a checkbox toggle on page 2 re-renders on page 2, not page 0. The pagination
 * router then overrides only the section that was navigated. A plain `@UpdateStage`.
 */
@Injectable()
@UpdateStage({ order: BuiltinStageOrder.PaginationCursors })
export class PaginationCursorStage implements UpdateStage {
  apply(ctx: TelegramExecutionContext): void {
    const message = ctx.update.callback_query?.message;
    // An inaccessible message carries no markup; `in` narrows it off the union.
    if (
      message !== undefined &&
      'reply_markup' in message &&
      message.reply_markup !== undefined
    ) {
      setAmbient(
        PAGINATION_CURSORS,
        readPaginationCursors(message.reply_markup),
      );
    }
  }
}

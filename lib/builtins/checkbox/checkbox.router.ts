import { Logger } from '@nestjs/common';

import { Router } from '../../decorators/injectable/router.decorator';
import { Action } from '../../decorators/listeners/action.decorator';
import { Param } from '../../decorators/params/param.decorator';
import {
  CHECKBOX_PARAMS,
  CHECKBOX_TOGGLE_ROUTE,
  InlineKeyboard,
} from '../../keyboards';

/**
 * Drives every `InlineKeyboard.checkboxes(...)` group: a tap on a checkbox button
 * routes here, the matching keyboard is resolved by id, the selection change is
 * applied (toggle/radio + persistence), and the re-rendered keyboard is returned
 * so the return-value pipeline edits the message markup in place.
 *
 * The router is a plain `@Router`/`@Action` a user could have written; the
 * registry it reads is framework-owned (a private static on `InlineKeyboard`).
 * The route handles the tap, so the dead-button warning never fires and
 * auto-answer stops the spinner. An unregistered id (an inline keyboard lost on
 * restart) is a logged no-op, never a crash.
 */
@Router()
export class CheckboxRouter {
  private readonly logger = new Logger('Checkbox');

  @Action(CHECKBOX_TOGGLE_ROUTE)
  toggle(
    @Param(CHECKBOX_PARAMS.cb) cb: string,
    @Param(CHECKBOX_PARAMS.item) item: string,
  ): InlineKeyboard | void {
    const keyboard = InlineKeyboard.resolveCheckbox(cb);
    if (keyboard === undefined) {
      this.logger.warn(
        `Checkbox "${cb}" is not registered — it was likely declared inline and ` +
          'lost on restart, so the tap is a no-op. Re-open the keyboard to refresh ' +
          '(the selection in the session store is intact).',
      );
      return;
    }
    keyboard.applyCheckboxToggle(cb, item);
    return keyboard; // a bare keyboard return edits the message markup in place
  }
}

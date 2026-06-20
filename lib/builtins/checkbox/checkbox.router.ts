import { Logger, Optional } from '@nestjs/common';

import { KeyboardRenderRegistry } from '../../engine/discovery';
import { Router } from '../../decorators/injectable/router.decorator';
import { Action } from '../../decorators/listeners/action.decorator';
import { Param } from '../../decorators/params/param.decorator';
import {
  CHECKBOX_CLEAR_ROUTE,
  CHECKBOX_PARAMS,
  CHECKBOX_TOGGLE_ROUTE,
  InlineKeyboard,
} from '../../keyboards';

/**
 * Drives every `InlineKeyboard.checkboxes(...)` group: a tap on a checkbox button
 * routes here, the keyboard for the group is rebuilt, the selection change is
 * applied (toggle/radio + persistence to the per-message keyboard state), and the
 * rebuilt keyboard is returned so the return-value pipeline edits the markup in
 * place.
 *
 * The keyboard comes from a declared `@KeyboardRender(...)` builder when there is
 * one — re-invoked fresh, so the whole keyboard re-derives its data and reflects
 * current state, and re-rendering survives a restart. Otherwise it falls back to
 * the inline keyboard registered when it was last shown (lost on restart).
 *
 * A plain `@Router`/`@Action` a user could have written. The route handles the
 * tap, so the dead-button warning never fires and auto-answer stops the spinner.
 * A group with neither a builder nor a live inline keyboard is a logged no-op.
 */
@Router()
export class CheckboxRouter {
  private readonly logger = new Logger('Checkbox');

  // `@Optional()`: absent in unit-built routers (`new CheckboxRouter()`), where the
  // inline registry fallback covers the resolve.
  constructor(
    @Optional() private readonly renderers?: KeyboardRenderRegistry,
  ) {}

  @Action(CHECKBOX_TOGGLE_ROUTE)
  toggle(
    @Param(CHECKBOX_PARAMS.cb) cb: string,
    @Param(CHECKBOX_PARAMS.item) item: string,
  ): Promise<InlineKeyboard | void> {
    return this.applyAndRender(cb, (kb) => kb.applyCheckboxToggle(cb, item));
  }

  @Action(CHECKBOX_CLEAR_ROUTE)
  clear(@Param(CHECKBOX_PARAMS.cb) cb: string): Promise<InlineKeyboard | void> {
    return this.applyAndRender(cb, (kb) => kb.applyCheckboxClear(cb));
  }

  // Apply a state change to group `cb`, then re-render. With a @KeyboardRender
  // builder: build to reach the binding (its config is static), apply — mutating
  // the ambient state — then re-build so a dependent group re-derives from the new
  // state (two builds, accepted: a builder reads ambient data, not I/O). Without a
  // builder: mutate the live inline keyboard (its lazy toJSON re-renders; a
  // dependent group can't re-derive — the surrounding layout is frozen).
  private async applyAndRender(
    cb: string,
    mutate: (keyboard: InlineKeyboard) => void,
  ): Promise<InlineKeyboard | void> {
    const renderer = this.renderers?.get(cb);
    if (renderer === undefined) {
      const inline = InlineKeyboard.resolveCheckbox(cb);
      if (inline === undefined) {
        this.warnNoKeyboard(cb);
        return;
      }
      mutate(inline);
      return inline;
    }
    const applied = await renderer();
    mutate(applied);
    return renderer();
  }

  private warnNoKeyboard(cb: string): void {
    this.logger.warn(
      `Checkbox "${cb}" has no @KeyboardRender builder and no live inline ` +
        'keyboard — it was likely declared inline and lost on restart, so the ' +
        'tap is a no-op. Re-open the keyboard, or declare a @KeyboardRender ' +
        'builder so re-render survives restarts.',
    );
  }
}

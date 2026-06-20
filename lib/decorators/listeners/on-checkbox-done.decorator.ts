import { CallbackRoutePattern } from '../../callback-data';
import {
  CHECKBOX_DONE_ROUTE,
  CHECKBOX_PARAMS,
} from '../../keyboards/checkbox.constants';
import { Action } from './action.decorator';

/**
 * Handles the Done button of an `InlineKeyboard.checkboxes(id, …)` group — the
 * `cb.done(label)` button. Sugar over `@Action('checkbox/<id>/done')`: a plain
 * route a user could have written, so the handler runs with the full pipeline
 * (`@Session()`, DI, guards). Pair it with `@CheckboxIds(id)` to receive the
 * picks directly.
 *
 * ```ts
 * @OnCheckboxDone('tags')
 * save(@CheckboxIds('tags') ids: string[], @Session() s: Prefs) { … }
 * ```
 */
export const OnCheckboxDone = (id: string): MethodDecorator =>
  Action(
    CallbackRoutePattern.build(CHECKBOX_DONE_ROUTE, {
      [CHECKBOX_PARAMS.cb]: id,
    }),
  );

import { createParamDecorator } from '@nestjs/common';

import { InlineKeyboard } from '../../keyboards';

/**
 * The currently-selected ids of checkbox group `id` — read on a `@OnCheckboxDone`
 * (or any) handler, without touching the session key by hand:
 *
 * ```ts
 * @OnCheckboxDone('tags')
 * save(@CheckboxIds('tags') ids: string[]) { … }
 * ```
 *
 * Resolves to `[]` when the group isn't registered (e.g. an inline keyboard lost
 * on restart). Reads the current user's selection via the ambient session.
 */
export const CheckboxIds = createParamDecorator(
  (id: string): string[] =>
    InlineKeyboard.resolveCheckbox(id)?.checkboxSelection(id) ?? [],
);

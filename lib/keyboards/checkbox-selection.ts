import { Logger } from '@nestjs/common';

import { getAmbient } from '../ambient';
import { CHECKBOX_STATE_PREFIX } from './checkbox.constants';
import { InlineKeyboard } from './inline-keyboard';
import { KEYBOARD_STATE } from './state/keyboard-state.constants';

const logger = new Logger('CheckboxSelection');

/**
 * The current selection of checkbox group `id`, read off the ambient keyboard
 * state — for a `@KeyboardRender` builder (or a custom `@Action`) to read one
 * group's picks. The flagship: a category radio drives which tags render.
 *
 * ```ts
 * @KeyboardRender('category', 'tags')
 * menu() {
 *   const [category] = selectedIds('category');
 *   const tags = category ? this.tags.byCategory(category) : [];
 *   return new InlineKeyboard()
 *     .radio('category', (cb) => cb.map(CATS, (c) => cb.toggle(c.name, c.id)))
 *     .checkboxes('tags', (cb) => cb.map(tags, (t) => cb.toggle(t.name, t.id)));
 * }
 * ```
 *
 * Reads the persisted keyboard-state selection at the group's UNSCOPED key, so use
 * it for the unscoped driver (the category), not a `scope`d group — read those via
 * `@CheckboxIds(id)`, which honours the scope. A `default`-seeded group isn't
 * reflected until its first tap (the seed is config, not yet in state), and a
 * custom-store group (`onChange`/`onToggle` + `selected`) is read through its own
 * `selected` reader — so for those, drive the dependency from a real interaction.
 */
export function selectedIds(id: string): string[] {
  const state = getAmbient<Record<string, unknown>>(KEYBOARD_STATE);
  const value = state?.[`${CHECKBOX_STATE_PREFIX}${id}`];
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Replace checkbox group `id`'s selection — the write a custom `@Action` makes
 * (a radio group keeps one). Scope-aware (it writes the current scope's set), since
 * it goes through the group's binding. A no-op (with a warning) if `id` is not a
 * checkbox group on the current keyboard.
 */
export function setSelectedIds(id: string, ids: Iterable<string>): void {
  resolveGroup(id)?.applyCheckboxSet(id, ids);
}

/** Clear checkbox group `id`'s selection — scope-aware, for a custom `@Action`. */
export function clearSelectedIds(id: string): void {
  resolveGroup(id)?.applyCheckboxClear(id);
}

// The write rail needs the group's binding (for the scope); resolve it, warning
// on a miss so a typo'd id isn't a silent dead write (mirrors the no-keyboard warn).
function resolveGroup(id: string): InlineKeyboard | undefined {
  const keyboard = InlineKeyboard.resolveCheckbox(id);
  if (keyboard === undefined) {
    logger.warn(
      `A keyboard action wrote group "${id}", which is not a registered checkbox ` +
        'group on this keyboard — the change is a no-op. Check the id.',
    );
  }
  return keyboard;
}

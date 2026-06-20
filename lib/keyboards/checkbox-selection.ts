import { getAmbient } from '../ambient';
import { CHECKBOX_STATE_PREFIX } from './checkbox.constants';
import { KEYBOARD_STATE } from './state/keyboard-state.constants';

/**
 * The current selection of checkbox group `id`, read off the ambient keyboard
 * state — for a `@KeyboardRender` builder to drive dependent content from another
 * group's picks. The flagship: a category radio drives which tags render.
 *
 * ```ts
 * @KeyboardRender('category', 'tags')
 * menu() {
 *   const [category] = selectedIds('category');
 *   const tags = category ? this.tags.byCategory(category) : [];
 *   return new InlineKeyboard()
 *     .checkboxes('category', (cb) => cb.map(CATS, (c) => cb.toggle(c.name, c.id)), { multi: false })
 *     .checkboxes('tags', (cb) => cb.map(tags, (t) => cb.toggle(t.name, t.id)));
 * }
 * ```
 *
 * Reads the persisted keyboard-state selection only. A `default`-seeded group
 * isn't reflected until its first tap (the seed is config, not yet in state), and
 * a custom-store group (`onChange`/`onToggle` + `selected`) is read through its own
 * `selected` reader — so for those, drive the dependency from a real interaction.
 */
export function selectedIds(id: string): string[] {
  const state = getAmbient<Record<string, unknown>>(KEYBOARD_STATE);
  const value = state?.[`${CHECKBOX_STATE_PREFIX}${id}`];
  return Array.isArray(value) ? value.map(String) : [];
}

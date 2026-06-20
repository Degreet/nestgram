/**
 * `.paginate(id)` called INSIDE a checkbox build paginates only the rows above it
 * (the toggle items); a `.row(...)` added after it is a separate section that does
 * NOT scroll. This is how a paginated picker keeps its Done/Reset controls pinned
 * on every page instead of letting them ride off onto the last one.
 */
import { runAmbient, setAmbient } from '../ambient';
import { InlineKeyboard } from './inline-keyboard';
import { PAGINATION_CURSORS } from './pagination.constants';

const TAGS = ['a', 'b', 'c', 'd', 'e', 'f']; // 6 items, size 2 → 3 pages

function callbacksByRow(page: number): string[][] {
  return runAmbient(() => {
    setAmbient(PAGINATION_CURSORS, { tags: page });
    const keyboard = new InlineKeyboard().checkboxes(
      'tags',
      (cb) =>
        cb
          .map(TAGS, (t) => cb.toggle(t, t))
          .split(1)
          .paginate('tags', { size: 2 }) // items above scroll…
          .row(cb.clear('Reset'), cb.done('Done')), // …controls below stay pinned
    );
    return keyboard
      .toJSON()
      .inline_keyboard.map((row) =>
        row.map((button) => button.callback_data ?? ''),
      );
  });
}

describe('paginate() inside a checkbox build pins trailing controls', () => {
  it('keeps the control row on page 0, below the paged items and nav', () => {
    expect(callbacksByRow(0)).toEqual([
      ['checkbox/tags/toggle/a'],
      ['checkbox/tags/toggle/b'],
      ['pageat/tags/0', 'pagego/tags/1'], // nav: counter + next (no prev on page 0)
      ['checkbox/tags/clear', 'checkbox/tags/done'], // controls, pinned
    ]);
  });

  it('shows different items on page 1 but the SAME pinned control row', () => {
    expect(callbacksByRow(1)).toEqual([
      ['checkbox/tags/toggle/c'],
      ['checkbox/tags/toggle/d'],
      ['pagego/tags/0', 'pageat/tags/1', 'pagego/tags/2'], // prev + counter + next
      ['checkbox/tags/clear', 'checkbox/tags/done'], // same controls, still pinned
    ]);
  });
});

import { runAmbient, setAmbient } from '../ambient';
import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';
import { PAGINATION_CURSORS } from './pagination.constants';

interface Cell {
  text: string;
  callback_data: string;
}

const items = (n: number): { id: number }[] =>
  Array.from({ length: n }, (_, i) => ({ id: i }));

/**
 * A vertical (one-per-row) keyboard of `n` items, paginated as section `id`. The
 * current page comes from the ambient cursor map (set per render by the router),
 * so a test seeds it directly.
 */
function paged(
  n: number,
  id: string,
  opts: { size: number; page?: number; prev?: string; next?: string },
): Cell[][] {
  return runAmbient(() => {
    if (opts.page !== undefined) {
      setAmbient(PAGINATION_CURSORS, { [id]: opts.page });
    }
    return new InlineKeyboard()
      .map(items(n), (i) => Button.text(`i${i.id}`, 'open/:id', { id: i.id }))
      .split(1)
      .paginate(id, { size: opts.size, prev: opts.prev, next: opts.next })
      .toJSON().inline_keyboard as Cell[][];
  });
}

describe('InlineKeyboard.paginate', () => {
  it('renders no controls when everything fits on one page', () => {
    const rows = paged(3, 'list', { size: 8 });
    expect(rows).toEqual([
      [{ text: 'i0', callback_data: 'open/0' }],
      [{ text: 'i1', callback_data: 'open/1' }],
      [{ text: 'i2', callback_data: 'open/2' }],
    ]);
  });

  it('first page: items 0..3 + a Next-only nav, the counter carrying the current page', () => {
    const rows = paged(10, 'list', { size: 4, page: 0 });
    expect(
      rows
        .slice(0, 4)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i0', 'i1', 'i2', 'i3']);
    expect(rows.at(-1)).toEqual([
      { text: '1/3', callback_data: 'pageat/list/0' },
      { text: '›', callback_data: 'pagego/list/1' },
    ]);
  });

  it('middle page: Prev + counter + Next, with the right slice', () => {
    const rows = paged(10, 'list', { size: 4, page: 1 });
    expect(
      rows
        .slice(0, 4)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i4', 'i5', 'i6', 'i7']);
    expect(rows.at(-1)).toEqual([
      { text: '‹', callback_data: 'pagego/list/0' },
      { text: '2/3', callback_data: 'pageat/list/1' },
      { text: '›', callback_data: 'pagego/list/2' },
    ]);
  });

  it('last page: Prev-only, partial slice', () => {
    const rows = paged(10, 'list', { size: 4, page: 2 });
    expect(
      rows
        .slice(0, -1)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i8', 'i9']);
    expect(rows.at(-1)).toEqual([
      { text: '‹', callback_data: 'pagego/list/1' },
      { text: '3/3', callback_data: 'pageat/list/2' },
    ]);
  });

  it('clamps an out-of-range page to the last one', () => {
    const rows = paged(10, 'list', { size: 4, page: 99 });
    expect(rows.at(-1)?.[0]).toMatchObject({ callback_data: 'pagego/list/1' });
    expect(
      rows
        .slice(0, -1)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i8', 'i9']);
  });

  it('counts buttons (not rows) — a .split(2) grid paginates by pairs', () => {
    const rows = runAmbient(
      () =>
        new InlineKeyboard()
          .map(items(10), (i) =>
            Button.text(`i${i.id}`, 'open/:id', { id: i.id }),
          )
          .split(2)
          .paginate('list', { size: 8 })
          .toJSON().inline_keyboard as Cell[][],
    );
    // 8 buttons = 4 rows of 2, then the nav row.
    expect(rows.slice(0, -1).map((r) => r.length)).toEqual([2, 2, 2, 2]);
    expect(rows.at(-1)).toEqual([
      { text: '1/2', callback_data: 'pageat/list/0' },
      { text: '›', callback_data: 'pagego/list/1' },
    ]);
  });

  it('honors custom prev/next labels', () => {
    const rows = paged(10, 'list', {
      size: 4,
      page: 1,
      prev: '⬅️',
      next: '➡️',
    });
    expect(rows.at(-1)?.map((b) => b.text)).toEqual(['⬅️', '2/3', '➡️']);
  });

  it('leaves rows added after it off the paged region', () => {
    const rows = runAmbient(
      () =>
        new InlineKeyboard()
          .map(items(10), (i) =>
            Button.text(`i${i.id}`, 'open/:id', { id: i.id }),
          )
          .split(1)
          .paginate('list', { size: 4 })
          .row(Button.text('Back', 'back'))
          .toJSON().inline_keyboard as Cell[][],
    );
    expect(rows.at(-1)).toEqual([{ text: 'Back', callback_data: 'back' }]);
    // The nav row is the one before the appended Back row.
    expect(
      rows[rows.length - 2].some((b) => b.callback_data === 'pagego/list/1'),
    ).toBe(true);
  });

  it('paginates two sections independently from their own cursors', () => {
    const rows = runAmbient(() => {
      setAmbient(PAGINATION_CURSORS, { a: 1, b: 0 });
      return new InlineKeyboard()
        .map(items(6), (i) => Button.text(`a${i.id}`, 'a/:id', { id: i.id }))
        .split(1)
        .paginate('a', { size: 2 })
        .map(items(6), (i) => Button.text(`b${i.id}`, 'b/:id', { id: i.id }))
        .split(1)
        .paginate('b', { size: 2 })
        .toJSON().inline_keyboard as Cell[][];
    });

    // Section a on page 1 (a2, a3) + its nav; section b on page 0 (b0, b1) + nav.
    expect(rows.map((r) => r.map((b) => b.text))).toEqual([
      ['a2'],
      ['a3'],
      ['‹', '2/3', '›'],
      ['b0'],
      ['b1'],
      ['1/3', '›'],
    ]);
    expect(rows[2].map((b) => b.callback_data)).toEqual([
      'pagego/a/0',
      'pageat/a/1',
      'pagego/a/2',
    ]);
    expect(rows[5].map((b) => b.callback_data)).toEqual([
      'pageat/b/0',
      'pagego/b/1',
    ]);
  });

  describe('validation', () => {
    it('rejects a non-positive or fractional size', () => {
      expect(() => new InlineKeyboard().paginate('list', { size: 0 })).toThrow(
        /positive integer size/,
      );
      expect(() =>
        new InlineKeyboard().paginate('list', { size: 2.5 }),
      ).toThrow(/positive integer size/);
    });

    it('rejects two sections sharing one id', () => {
      expect(() =>
        new InlineKeyboard()
          .map(items(4), (i) => Button.text(`i${i.id}`, 'o/:id', { id: i.id }))
          .split(1)
          .paginate('dup', { size: 2 })
          .map(items(4), (i) => Button.text(`j${i.id}`, 'p/:id', { id: i.id }))
          .split(1)
          .paginate('dup', { size: 2 }),
      ).toThrow(/unique id/);
    });

    it('rejects paginate() sharing a keyboard with a checkbox group', () => {
      expect(() =>
        new InlineKeyboard()
          .checkboxes('tags', (cb) =>
            cb.map(items(5), (i) => cb.toggle(`i${i.id}`, i.id)).split(1),
          )
          .paginate('list', { size: 2 }),
      ).toThrow(/checkbox group/);
    });
  });
});

import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';
import { NOOP_CALLBACK_DATA } from './noop.constants';

interface Cell {
  text: string;
  callback_data: string;
}

const items = (n: number): { id: number }[] =>
  Array.from({ length: n }, (_, i) => ({ id: i }));

/** A vertical (one-per-row) keyboard of `n` items, paginated. */
function paged(
  n: number,
  route: string,
  opts: { size: number; page?: number; prev?: string; next?: string },
) {
  return new InlineKeyboard()
    .map(items(n), (i) => Button.text(`i${i.id}`, 'open/:id', { id: i.id }))
    .split(1)
    .paginate(route, opts)
    .toJSON().inline_keyboard as Cell[][];
}

describe('InlineKeyboard.paginate', () => {
  it('renders no controls when everything fits on one page', () => {
    const rows = paged(3, 'list/page/:n', { size: 8 });
    expect(rows).toEqual([
      [{ text: 'i0', callback_data: 'open/0' }],
      [{ text: 'i1', callback_data: 'open/1' }],
      [{ text: 'i2', callback_data: 'open/2' }],
    ]);
  });

  it('first page: items 0..3 + a Next-only nav with a noop counter', () => {
    const rows = paged(10, 'list/page/:n', { size: 4, page: 0 });
    expect(
      rows
        .slice(0, 4)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i0', 'i1', 'i2', 'i3']);
    expect(rows.at(-1)).toEqual([
      { text: '1/3', callback_data: NOOP_CALLBACK_DATA },
      { text: '›', callback_data: 'list/page/1' },
    ]);
  });

  it('middle page: Prev + counter + Next, with the right slice', () => {
    const rows = paged(10, 'list/page/:n', { size: 4, page: 1 });
    expect(
      rows
        .slice(0, 4)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i4', 'i5', 'i6', 'i7']);
    expect(rows.at(-1)).toEqual([
      { text: '‹', callback_data: 'list/page/0' },
      { text: '2/3', callback_data: NOOP_CALLBACK_DATA },
      { text: '›', callback_data: 'list/page/2' },
    ]);
  });

  it('last page: Prev-only, partial slice', () => {
    const rows = paged(10, 'list/page/:n', { size: 4, page: 2 });
    expect(
      rows
        .slice(0, -1)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i8', 'i9']);
    expect(rows.at(-1)).toEqual([
      { text: '‹', callback_data: 'list/page/1' },
      { text: '3/3', callback_data: NOOP_CALLBACK_DATA },
    ]);
  });

  it('clamps an out-of-range page to the last one', () => {
    const rows = paged(10, 'list/page/:n', { size: 4, page: 99 });
    expect(rows[rows.length - 1][0]).toMatchObject({
      callback_data: 'list/page/1',
    });
    expect(
      rows
        .slice(0, -1)
        .flat()
        .map((b) => b.text),
    ).toEqual(['i8', 'i9']);
  });

  it('counts buttons (not rows) — a .split(2) grid paginates by pairs', () => {
    const rows = new InlineKeyboard()
      .map(items(10), (i) => Button.text(`i${i.id}`, 'open/:id', { id: i.id }))
      .split(2)
      .paginate('list/page/:n', { size: 8, page: 0 })
      .toJSON().inline_keyboard as Cell[][];
    // 8 buttons = 4 rows of 2, then the nav row.
    expect(rows.slice(0, -1).map((r) => r.length)).toEqual([2, 2, 2, 2]);
    expect(rows.at(-1)).toEqual([
      { text: '1/2', callback_data: NOOP_CALLBACK_DATA },
      { text: '›', callback_data: 'list/page/1' },
    ]);
  });

  it('honors custom prev/next labels', () => {
    const rows = paged(10, 'list/page/:n', {
      size: 4,
      page: 1,
      prev: '⬅️',
      next: '➡️',
    });
    expect(rows[rows.length - 1].map((b) => b.text)).toEqual([
      '⬅️',
      '2/3',
      '➡️',
    ]);
  });

  it('leaves rows added after it off the paged region', () => {
    const rows = new InlineKeyboard()
      .map(items(10), (i) => Button.text(`i${i.id}`, 'open/:id', { id: i.id }))
      .split(1)
      .paginate('list/page/:n', { size: 4, page: 0 })
      .row(Button.text('Back', 'back'))
      .toJSON().inline_keyboard as Cell[][];
    expect(rows[rows.length - 1]).toEqual([
      { text: 'Back', callback_data: 'back' },
    ]);
    // The nav row is the one before the appended Back row.
    expect(
      rows[rows.length - 2].some((b) => b.callback_data === 'list/page/1'),
    ).toBe(true);
  });

  describe('validation', () => {
    it('rejects a non-positive or fractional size', () => {
      expect(() =>
        new InlineKeyboard().paginate('list/page/:n', { size: 0 }),
      ).toThrow(/positive integer size/);
      expect(() =>
        new InlineKeyboard().paginate('list/page/:n', { size: 2.5 }),
      ).toThrow(/positive integer size/);
    });

    it('rejects a route without exactly one page param', () => {
      expect(() =>
        new InlineKeyboard()
          .map(items(5), (i) => Button.text(`i${i.id}`, 'o/:id', { id: i.id }))
          .split(1)
          .paginate('list/page', { size: 2 }),
      ).toThrow(/exactly one :param/);
      expect(() =>
        new InlineKeyboard()
          .map(items(5), (i) => Button.text(`i${i.id}`, 'o/:id', { id: i.id }))
          .split(1)
          .paginate('list/:a/:b', { size: 2 }),
      ).toThrow(/exactly one :param/);
    });

    it('rejects a second paginated region on one keyboard', () => {
      expect(() =>
        new InlineKeyboard()
          .map(items(5), (i) => Button.text(`i${i.id}`, 'o/:id', { id: i.id }))
          .split(1)
          .paginate('a/page/:n', { size: 2 })
          .paginate('b/page/:n', { size: 2 }),
      ).toThrow(/once/);
    });

    it('rejects paginate() sharing a keyboard with a checkbox group', () => {
      expect(() =>
        new InlineKeyboard()
          .checkboxes('tags', (cb) =>
            cb.map(items(5), (i) => cb.toggle(`i${i.id}`, i.id)).split(1),
          )
          .paginate('list/page/:n', { size: 2 }),
      ).toThrow(/checkbox group/);
    });
  });
});

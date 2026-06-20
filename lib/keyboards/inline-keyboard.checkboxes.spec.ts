import { runAmbient, setAmbient } from '../ambient';
import { SESSION } from '../sessions/session.constants';
import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';
import type { CheckboxConfig } from './checkbox.types';

interface Tag {
  id: string;
  name: string;
}

const TAGS: Tag[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];

interface Cell {
  text: string;
  callback_data: string;
}

const rows = (kb: InlineKeyboard): Cell[][] =>
  kb.toJSON().inline_keyboard as Cell[][];

/** A vertical tags keyboard whose selection comes from `config`. */
const tagsKeyboard = (id: string, config: CheckboxConfig): InlineKeyboard =>
  new InlineKeyboard().checkboxes(
    id,
    (cb) => cb.map(TAGS, (t) => cb.toggle(t.name, t.id)).split(1),
    config,
  );

describe('InlineKeyboard.checkboxes', () => {
  it('auto-marks each button from the selection and routes by item', () => {
    const kb = tagsKeyboard('cb-render', { selected: () => new Set(['b']) });

    const flat = rows(kb).flat();
    expect(flat.map((b) => b.text)).toEqual(['Alpha', '✅ Beta', 'Gamma']);
    expect(flat.map((b) => b.callback_data)).toEqual([
      'checkbox/cb-render/toggle/a',
      'checkbox/cb-render/toggle/b',
      'checkbox/cb-render/toggle/c',
    ]);
  });

  it('splices the section between surrounding eager rows', () => {
    const kb = new InlineKeyboard()
      .row(Button.text('Title', 'noop'))
      .checkboxes('cb-splice', (cb) =>
        cb.map(TAGS, (t) => cb.toggle(t.name, t.id)).split(1),
      )
      .row(Button.text('✓ Done', 'tags/done'));

    const layout = rows(kb);
    expect(layout[0]).toEqual([{ text: 'Title', callback_data: 'noop' }]);
    expect(layout[layout.length - 1]).toEqual([
      { text: '✓ Done', callback_data: 'tags/done' },
    ]);
    expect(layout).toHaveLength(5); // Title + 3 items + Done
  });

  it('re-renders from the current selection on each toJSON', () => {
    const chosen = new Set<string>();
    const kb = tagsKeyboard('cb-rerun', { selected: () => chosen });

    expect(
      rows(kb)
        .flat()
        .map((b) => b.text),
    ).toEqual(['Alpha', 'Beta', 'Gamma']);
    chosen.add('c');
    expect(
      rows(kb)
        .flat()
        .map((b) => b.text),
    ).toEqual(['Alpha', 'Beta', '✅ Gamma']);
  });

  it('uses radio glyphs, with per-button active and marker overrides', () => {
    const kb = new InlineKeyboard().checkboxes(
      'radio',
      (cb) =>
        cb
          .map(TAGS, (t) =>
            cb.toggle(t.name, t.id, {
              active: t.id === 'a', // force this one on
              markers: t.id === 'c' ? { on: '⭐', off: '' } : undefined,
            }),
          )
          .split(1),
      { multi: false },
    );
    expect(
      rows(kb)
        .flat()
        .map((b) => b.text),
    ).toEqual([
      '🔘 Alpha',
      '⚪ Beta',
      'Gamma', // per-button override: off marker is ''
    ]);
  });

  describe('resolveCheckbox + applyCheckboxToggle', () => {
    it('registers under its id and applies a multi-select toggle', () => {
      const set = new Set<string>(['a']);
      const kb = tagsKeyboard('multi', {
        selected: () => set,
        onChange: (ids) => {
          set.clear();
          ids.forEach((id) => set.add(id));
        },
      });

      expect(InlineKeyboard.resolveCheckbox('multi')).toBe(kb);

      kb.applyCheckboxToggle('multi', 'b');
      expect([...set].sort()).toEqual(['a', 'b']);
      kb.applyCheckboxToggle('multi', 'a');
      expect([...set]).toEqual(['b']);
    });

    it('replaces the selection for a radio group', () => {
      const set = new Set<string>(['a']);
      const kb = tagsKeyboard('r', {
        multi: false,
        selected: () => set,
        onChange: (ids) => {
          set.clear();
          ids.forEach((id) => set.add(id));
        },
      });

      kb.applyCheckboxToggle('r', 'b');
      expect([...set]).toEqual(['b']);
    });

    it('ignores a toggle addressed to a different group id', () => {
      const set = new Set<string>(['a']);
      let changed = false;
      const kb = tagsKeyboard('mine', {
        selected: () => set,
        onChange: () => {
          changed = true;
        },
      });
      kb.applyCheckboxToggle('not-mine', 'b');
      expect([...set]).toEqual(['a']); // untouched
      expect(changed).toBe(false); // onChange never fired
    });
  });

  it('persists to and reads from the ambient session by default', () => {
    runAmbient(() => {
      const session: Record<string, unknown> = {};
      setAmbient(SESSION, session);

      const kb = tagsKeyboard('sess', {});

      kb.applyCheckboxToggle('sess', 'a');
      kb.applyCheckboxToggle('sess', 'c');
      expect(session['checkbox:sess']).toEqual(['a', 'c']);
      expect(
        rows(kb)
          .flat()
          .map((b) => b.text),
      ).toEqual(['✅ Alpha', 'Beta', '✅ Gamma']);
    });
  });

  it('rejects a second checkbox group on one keyboard', () => {
    const kb = tagsKeyboard('first', {});
    expect(() =>
      kb.checkboxes('second', (cb) =>
        cb.map(TAGS, (t) => cb.toggle(t.name, t.id)).split(1),
      ),
    ).toThrow(/one checkbox group/);
  });

  it('cb.done() routes to checkbox/<id>/done', () => {
    const kb = new InlineKeyboard().checkboxes(
      'dn',
      (cb) =>
        cb
          .map(TAGS, (t) => cb.toggle(t.name, t.id))
          .split(1)
          .row(cb.done('✓ Save')),
      { selected: () => new Set(['a']) },
    );
    const layout = rows(kb);
    expect(layout[layout.length - 1]).toEqual([
      { text: '✓ Save', callback_data: 'checkbox/dn/done' },
    ]);
  });

  it('checkboxSelection() exposes the current picks (for @CheckboxIds)', () => {
    const kb = tagsKeyboard('sel', { selected: () => new Set(['a', 'c']) });
    expect(kb.checkboxSelection().sort()).toEqual(['a', 'c']);
    expect(
      InlineKeyboard.resolveCheckbox('sel')?.checkboxSelection().sort(),
    ).toEqual(['a', 'c']);
  });
});

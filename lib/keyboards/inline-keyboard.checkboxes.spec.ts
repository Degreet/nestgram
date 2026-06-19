import { runAmbient, setAmbient } from '../ambient';
import { SESSION } from '../sessions/session.constants';
import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';

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

describe('InlineKeyboard.checkboxes', () => {
  it('renders marked toggle buttons routed into checkbox/<id>/toggle/<item>', () => {
    const chosen = new Set(['b']);
    const kb = new InlineKeyboard().checkboxes('cb-render', (cb) =>
      cb.map(TAGS, (t) => cb.toggle(chosen.has(t.id), t.name, t.id)).split(1),
    );

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
        cb.map(TAGS, (t) => cb.toggle(false, t.name, t.id)).split(1),
      )
      .row(Button.text('✓ Done', 'tags/done'));

    const layout = rows(kb);
    expect(layout[0]).toEqual([{ text: 'Title', callback_data: 'noop' }]);
    expect(layout[layout.length - 1]).toEqual([
      { text: '✓ Done', callback_data: 'tags/done' },
    ]);
    expect(layout).toHaveLength(5); // Title + 3 items + Done
  });

  it('re-renders from current state on each toJSON (re-run)', () => {
    const chosen = new Set<string>();
    const kb = new InlineKeyboard().checkboxes('cb-rerun', (cb) =>
      cb.map(TAGS, (t) => cb.toggle(chosen.has(t.id), t.name, t.id)).split(1),
    );

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

  it('uses radio glyphs and an optional per-button marker', () => {
    const kb = new InlineKeyboard().checkboxes(
      'radio',
      (cb) =>
        cb
          .map(TAGS, (t) =>
            cb.toggle(
              t.id === 'a',
              t.name,
              t.id,
              t.id === 'c' ? { on: '⭐', off: '' } : undefined,
            ),
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
      const kb = new InlineKeyboard().checkboxes(
        'multi',
        (cb) =>
          cb.map(TAGS, (t) => cb.toggle(set.has(t.id), t.name, t.id)).split(1),
        {
          selected: () => set,
          onChange: (ids) => {
            set.clear();
            ids.forEach((id) => set.add(id));
          },
        },
      );

      expect(InlineKeyboard.resolveCheckbox('multi')).toBe(kb);

      kb.applyCheckboxToggle('multi', 'b');
      expect([...set].sort()).toEqual(['a', 'b']);
      kb.applyCheckboxToggle('multi', 'a');
      expect([...set]).toEqual(['b']);
    });

    it('replaces the selection for a radio group', () => {
      const set = new Set<string>(['a']);
      const kb = new InlineKeyboard().checkboxes(
        'r',
        (cb) =>
          cb.map(TAGS, (t) => cb.toggle(set.has(t.id), t.name, t.id)).split(1),
        {
          multi: false,
          selected: () => set,
          onChange: (ids) => {
            set.clear();
            ids.forEach((id) => set.add(id));
          },
        },
      );

      kb.applyCheckboxToggle('r', 'b');
      expect([...set]).toEqual(['b']);
    });
  });

  it('persists to the ambient session by default (no selected/onChange)', () => {
    runAmbient(() => {
      const session: Record<string, unknown> = {};
      setAmbient(SESSION, session);

      const kb = new InlineKeyboard().checkboxes('sess', (cb) =>
        cb
          .map(TAGS, (t) =>
            cb.toggle(
              ((session['checkbox:sess'] as string[]) ?? []).includes(t.id),
              t.name,
              t.id,
            ),
          )
          .split(1),
      );

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
    const kb = new InlineKeyboard().checkboxes('first', (cb) =>
      cb.map(TAGS, (t) => cb.toggle(false, t.name, t.id)).split(1),
    );
    expect(() =>
      kb.checkboxes('second', (cb) =>
        cb.map(TAGS, (t) => cb.toggle(false, t.name, t.id)).split(1),
      ),
    ).toThrow(/one checkbox group/);
  });
});

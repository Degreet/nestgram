import { runAmbient, setAmbient } from '../ambient';
import { SESSION } from '../sessions/session.constants';
import { Button } from './button';
import { CheckboxKeyboard } from './checkbox-keyboard';

interface Tag {
  id: string;
  name: string;
}

const TAGS: Tag[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
];

/** The `{ text, callback_data }` rows a keyboard renders to. */
function rows(kb: { toJSON(): { inline_keyboard: unknown[][] } }) {
  return kb.toJSON().inline_keyboard as {
    text: string;
    callback_data: string;
  }[][];
}

describe('CheckboxKeyboard', () => {
  describe('render', () => {
    it('marks selected items and routes each into checkbox/<id>/toggle/<key>', () => {
      const chosen = new Set(['b']);
      const kb = new CheckboxKeyboard<Tag>({
        id: 'tags',
        items: TAGS,
        selected: () => chosen,
      })
        .key((t) => t.id)
        .label((t) => t.name);

      const flat = rows(kb.render()).flat();
      expect(flat.map((b) => b.text)).toEqual(['☐ Alpha', '☑ Beta', '☐ Gamma']);
      expect(flat.map((b) => b.callback_data)).toEqual([
        'checkbox/tags/toggle/a',
        'checkbox/tags/toggle/b',
        'checkbox/tags/toggle/c',
      ]);
    });

    it('defaults the item key to the list index', () => {
      const kb = new CheckboxKeyboard<string>({
        id: 'plain',
        items: ['One', 'Two'],
        selected: () => [],
      });
      expect(
        rows(kb.render())
          .flat()
          .map((b) => b.callback_data),
      ).toEqual(['checkbox/plain/toggle/0', 'checkbox/plain/toggle/1']);
    });

    it('lays items into columns and appends extra rows', () => {
      const kb = new CheckboxKeyboard<Tag>({
        id: 'grid',
        items: TAGS,
        selected: () => [],
      })
        .key((t) => t.id)
        .label((t) => t.name)
        .columns(2)
        .row(Button.text('Save', 'grid/save'));

      const layout = rows(kb.render());
      expect(layout.map((r) => r.length)).toEqual([2, 1, 1]); // 2 per row, then Gamma, then Save
      const lastRow = layout[layout.length - 1];
      expect(lastRow[0]).toMatchObject({
        text: 'Save',
        callback_data: 'grid/save',
      });
    });

    it('overrides markers; empty markers drop the prefix', () => {
      const chosen = new Set(['a']);
      const kb = new CheckboxKeyboard<Tag>({
        id: 'm',
        items: TAGS,
        selected: () => chosen,
      })
        .key((t) => t.id)
        .label((t) => t.name)
        .markers('🔥', '');
      const labels = rows(kb.render())
        .flat()
        .map((b) => b.text);
      expect(labels).toEqual(['🔥 Alpha', 'Beta', 'Gamma']);
    });

    it('uses single-select glyphs when multi is false', () => {
      const kb = new CheckboxKeyboard<Tag>({
        id: 'radio',
        items: TAGS,
        multi: false,
        selected: () => ['a'],
      })
        .key((t) => t.id)
        .label((t) => t.name);
      expect(
        rows(kb.render())
          .flat()
          .map((b) => b.text),
      ).toEqual(['🔘 Alpha', '⚪ Beta', '⚪ Gamma']);
    });
  });

  describe('applyToggle — multi-select', () => {
    it('adds an unselected item and removes a selected one', () => {
      const set = new Set<string>(['a']);
      const kb = new CheckboxKeyboard<Tag>({
        id: 't',
        items: TAGS,
        selected: () => set,
        onChange: (ids) => {
          set.clear();
          ids.forEach((id) => set.add(id));
        },
      });

      kb.applyToggle('b');
      expect([...set].sort()).toEqual(['a', 'b']);
      kb.applyToggle('a');
      expect([...set]).toEqual(['b']);
    });
  });

  describe('applyToggle — single-select', () => {
    it('replaces the selection, and re-tapping clears it', () => {
      const set = new Set<string>(['a']);
      const kb = new CheckboxKeyboard<Tag>({
        id: 's',
        items: TAGS,
        multi: false,
        selected: () => set,
        onChange: (ids) => {
          set.clear();
          ids.forEach((id) => set.add(id));
        },
      });

      kb.applyToggle('b');
      expect([...set]).toEqual(['b']);
      kb.applyToggle('b');
      expect([...set]).toEqual([]);
    });
  });

  describe('write callbacks', () => {
    it('onChange receives the whole new set, once', () => {
      const calls: string[][] = [];
      const kb = new CheckboxKeyboard<Tag>({
        id: 'oc',
        items: TAGS,
        selected: () => ['a'],
        onChange: (ids) => calls.push(ids),
      });
      kb.applyToggle('b');
      expect(calls).toEqual([['a', 'b']]);
    });

    it('onToggle reports a per-item delta — once for multi', () => {
      const calls: [string, boolean][] = [];
      const kb = new CheckboxKeyboard<Tag>({
        id: 'ot',
        items: TAGS,
        selected: () => ['a'],
        onToggle: (id, on) => calls.push([id, on]),
      });
      kb.applyToggle('b');
      expect(calls).toEqual([['b', true]]);
    });

    it('onToggle fires twice on a single-select switch (old off, new on)', () => {
      const calls: [string, boolean][] = [];
      const kb = new CheckboxKeyboard<Tag>({
        id: 'ots',
        items: TAGS,
        multi: false,
        selected: () => ['a'],
        onToggle: (id, on) => calls.push([id, on]),
      });
      kb.applyToggle('b');
      expect(calls).toContainEqual(['a', false]);
      expect(calls).toContainEqual(['b', true]);
      expect(calls).toHaveLength(2);
    });
  });

  describe('session default (no selected/onChange)', () => {
    it('persists and reads the selection from the ambient session', () => {
      runAmbient(() => {
        const session: Record<string, unknown> = {};
        setAmbient(SESSION, session);

        const kb = new CheckboxKeyboard<Tag>({ id: 'sess', items: TAGS }).key(
          (t) => t.id,
        );

        kb.applyToggle('a');
        kb.applyToggle('c');
        expect(session['checkbox:sess']).toEqual(['a', 'c']);

        // A fresh render reflects what was stored.
        const marks = rows(kb.render())
          .flat()
          .map((b) => b.text.slice(0, 1));
        expect(marks).toEqual(['☑', '☐', '☑']);
      });
    });
  });

  describe('resolve', () => {
    it('returns the instance registered under an id', () => {
      const kb = new CheckboxKeyboard<Tag>({ id: 'reg', items: TAGS });
      expect(CheckboxKeyboard.resolve('reg')).toBe(kb);
      expect(CheckboxKeyboard.resolve('missing')).toBeUndefined();
    });
  });
});

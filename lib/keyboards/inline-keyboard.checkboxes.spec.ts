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

  describe('default seed', () => {
    it('seeds the selection while the session key is absent', () => {
      runAmbient(() => {
        setAmbient(SESSION, {});
        const kb = tagsKeyboard('seed', { default: ['a', 'c'] });
        expect(
          rows(kb)
            .flat()
            .map((b) => b.text),
        ).toEqual(['✅ Alpha', 'Beta', '✅ Gamma']);
      });
    });

    it('yields to a persisted selection — an empty pick sticks', () => {
      runAmbient(() => {
        const session: Record<string, unknown> = {};
        setAmbient(SESSION, session);
        const kb = tagsKeyboard('seed-off', { default: ['a'] });

        kb.applyCheckboxToggle('seed-off', 'a'); // turn the seeded one off
        expect(session['checkbox:seed-off']).toEqual([]);
        expect(
          rows(kb)
            .flat()
            .map((b) => b.text),
        ).toEqual(['Alpha', 'Beta', 'Gamma']); // default no longer reseeds
      });
    });

    it('is ignored when an explicit selected reader is supplied', () => {
      const kb = tagsKeyboard('seed-explicit', {
        default: ['a', 'b', 'c'],
        selected: () => new Set(['b']),
      });
      expect(
        rows(kb)
          .flat()
          .map((b) => b.text),
      ).toEqual(['Alpha', '✅ Beta', 'Gamma']);
    });

    it('seeds at most one id for a radio group', () => {
      runAmbient(() => {
        setAmbient(SESSION, {});
        const kb = new InlineKeyboard().checkboxes(
          'seed-radio',
          (cb) => cb.map(TAGS, (t) => cb.toggle(t.name, t.id)).split(1),
          { multi: false, default: ['a', 'b'] },
        );
        expect(
          rows(kb)
            .flat()
            .map((b) => b.text),
        ).toEqual(['🔘 Alpha', '⚪ Beta', '⚪ Gamma']); // only the first seeds
      });
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

  describe('config contract', () => {
    const build =
      (id: string, config: CheckboxConfig): (() => InlineKeyboard) =>
      () =>
        tagsKeyboard(id, config);

    it('rejects a custom store with no selected reader (toggling would break)', () => {
      expect(build('no-reader', { onChange: () => undefined })).toThrow(
        /selected reader/,
      );
      expect(build('no-reader2', { onToggle: () => undefined })).toThrow(
        /selected reader/,
      );
    });

    it('rejects onChange and onToggle together', () => {
      expect(
        build('both-writers', {
          selected: () => new Set<string>(),
          onChange: () => undefined,
          onToggle: () => undefined,
        }),
      ).toThrow(/mutually exclusive/);
    });
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

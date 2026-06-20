import { Logger } from '@nestjs/common';

import { InlineKeyboard } from '../../keyboards';
import { CheckboxRouter } from './checkbox.router';

describe('CheckboxRouter', () => {
  const router = new CheckboxRouter();

  it('applies the tapped change and returns the inline keyboard for an in-place edit', async () => {
    const set = new Set<string>(['a']);
    const keyboard = new InlineKeyboard().checkboxes(
      'router-multi',
      (cb) => cb.map(['a', 'b'], (id) => cb.toggle(id, id)).split(1),
      {
        selected: () => set,
        onChange: (ids) => {
          set.clear();
          ids.forEach((id) => set.add(id));
        },
      },
    );

    // No KeyboardRenderRegistry here → falls back to the inline-registered keyboard.
    const result = await router.toggle('router-multi', 'b');

    expect([...set].sort()).toEqual(['a', 'b']);
    expect(result).toBe(keyboard); // returned bare → ng-71 edits the markup in place
  });

  it('warns and no-ops for an id with neither a builder nor a live keyboard', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const result = await router.toggle('never-registered', 'x');

    expect(result).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('lost on restart'),
    );
    warn.mockRestore();
  });
});

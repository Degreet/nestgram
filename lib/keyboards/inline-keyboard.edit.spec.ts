import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';

const markup = () => ({
  inline_keyboard: [
    [
      { text: '☐ Milk', callback_data: 'toggle/1' },
      { text: '☐ Bread', callback_data: 'toggle/2' },
    ],
    [
      { text: 'Done', callback_data: 'done' },
      { text: 'Cancel', callback_data: 'cancel' },
    ],
  ],
});

describe('InlineKeyboard — editing an existing keyboard', () => {
  it('from() adopts a native markup and serializes it back', () => {
    expect(InlineKeyboard.from(markup()).toJSON()).toEqual(markup());
  });

  it('from() copies — edits never reach back into the source markup', () => {
    const source = markup();
    InlineKeyboard.from(source).setText('toggle/1', '☑ Milk');
    expect(source.inline_keyboard[0][0].text).toBe('☐ Milk');
  });

  it('from() deep-copies — a nested object is not shared with the source', () => {
    const source = {
      inline_keyboard: [[{ text: 'App', web_app: { url: 'a' } }]],
    };
    const adopted = InlineKeyboard.from(source).toJSON();

    const button = adopted.inline_keyboard[0][0];
    if (button.web_app) {
      button.web_app.url = 'b';
    }
    expect(source.inline_keyboard[0][0].web_app.url).toBe('a');
  });

  describe('route addressing', () => {
    it('a concrete route updates exactly one button', () => {
      const result = InlineKeyboard.from(markup())
        .setText('toggle/1', '☑ Milk')
        .toJSON();

      expect(result.inline_keyboard[0]).toEqual([
        { text: '☑ Milk', callback_data: 'toggle/1' },
        { text: '☐ Bread', callback_data: 'toggle/2' },
      ]);
    });

    it('a templated route updates all that fit, with captured params', () => {
      const result = InlineKeyboard.from(markup())
        .update('toggle/:id', (button, { id }) =>
          Button.from({ ...button.toJSON(), text: `#${id}` }),
        )
        .toJSON();

      expect(result.inline_keyboard[0]).toEqual([
        { text: '#1', callback_data: 'toggle/1' },
        { text: '#2', callback_data: 'toggle/2' },
      ]);
    });
  });

  it('predicate addressing matches on any button field', () => {
    const result = InlineKeyboard.from(markup())
      .update(
        (button) => button.label === 'Done',
        (button) => Button.from({ ...button.toJSON(), text: 'Save' }),
      )
      .toJSON();

    expect(result.inline_keyboard[1][0]).toEqual({
      text: 'Save',
      callback_data: 'done',
    });
  });

  it('replaceText addresses by visible label', () => {
    const result = InlineKeyboard.from(markup())
      .replaceText('Cancel', 'Back')
      .toJSON();

    expect(result.inline_keyboard[1][1]).toEqual({
      text: 'Back',
      callback_data: 'cancel',
    });
  });

  it('remove drops the matched button and collapses an emptied row', () => {
    const result = InlineKeyboard.from(markup()).remove('toggle/:id').toJSON();

    expect(result.inline_keyboard).toEqual([
      [
        { text: 'Done', callback_data: 'done' },
        { text: 'Cancel', callback_data: 'cancel' },
      ],
    ]);
  });

  describe('position addressing', () => {
    it('updateAt replaces the button at (row, col)', () => {
      const result = InlineKeyboard.from(markup())
        .updateAt(1, 0, (button) =>
          Button.from({ ...button.toJSON(), text: 'OK' }),
        )
        .toJSON();

      expect(result.inline_keyboard[1][0].text).toBe('OK');
    });

    it('removeAt drops the button at (row, col)', () => {
      const result = InlineKeyboard.from(markup()).removeAt(0, 0).toJSON();

      expect(result.inline_keyboard[0]).toEqual([
        { text: '☐ Bread', callback_data: 'toggle/2' },
      ]);
    });
  });

  it('row() adds a footer to an adopted keyboard', () => {
    const result = InlineKeyboard.from(markup())
      .row(Button.text('Next', 'page/:n', { n: 2 }))
      .toJSON();

    expect(result.inline_keyboard[2]).toEqual([
      { text: 'Next', callback_data: 'page/2' },
    ]);
  });

  it('the toggle scenario reads cleanly end to end', () => {
    // A user tapped Milk; flip just that checkbox and send the markup back.
    const id = 1;
    const result = InlineKeyboard.from(markup())
      .setText(`toggle/${id}`, '☑ Milk')
      .toJSON();

    expect(result.inline_keyboard[0][0].text).toBe('☑ Milk');
    expect(result.inline_keyboard[0][1].text).toBe('☐ Bread');
  });
});

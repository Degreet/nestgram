import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';

describe('InlineKeyboard — Button sugar', () => {
  describe('.map', () => {
    it('turns a collection into buttons, laid into a grid by .columns', () => {
      const items = [
        { id: 1, name: 'Milk' },
        { id: 2, name: 'Bread' },
        { id: 3, name: 'Eggs' },
      ];

      const markup = new InlineKeyboard()
        .columns(2)
        .map(items, (i) => Button.text(i.name, 'pick/:id', { id: i.id }))
        .toJSON();

      expect(markup).toEqual({
        inline_keyboard: [
          [
            { text: 'Milk', callback_data: 'pick/1' },
            { text: 'Bread', callback_data: 'pick/2' },
          ],
          [{ text: 'Eggs', callback_data: 'pick/3' }],
        ],
      });
    });

    it('drops an item when the callback returns a falsy value', () => {
      const markup = new InlineKeyboard()
        .map([1, 2, 3], (n) =>
          n === 2 ? null : Button.text(`#${n}`, `n/${n}`),
        )
        .toJSON();

      expect(markup.inline_keyboard[0]).toEqual([
        { text: '#1', callback_data: 'n/1' },
        { text: '#3', callback_data: 'n/3' },
      ]);
    });

    it('passes the index to the callback', () => {
      const markup = new InlineKeyboard()
        .map(['a', 'b'], (label, index) => Button.text(label, `at/${index}`))
        .toJSON();

      expect(markup.inline_keyboard[0]).toEqual([
        { text: 'a', callback_data: 'at/0' },
        { text: 'b', callback_data: 'at/1' },
      ]);
    });
  });

  describe('.add — universal Button inlet', () => {
    it('adds any Bot API button kind through Button values', () => {
      const markup = new InlineKeyboard()
        .add(Button.webApp('Open', 'https://app.dev'))
        .add(Button.pay('Pay'), Button.switchInline('Share', 'hi'))
        .toJSON();

      expect(markup.inline_keyboard[0]).toEqual([
        { text: 'Open', web_app: { url: 'https://app.dev' } },
        { text: 'Pay', pay: true },
        { text: 'Share', switch_inline_query: 'hi' },
      ]);
    });

    it('keeps a styled Button value over a pending colour modifier', () => {
      const markup = new InlineKeyboard()
        .primary() // pending modifier...
        .add(Button.text('Delete', 'del').danger()) // ...but the value is explicit
        .toJSON();

      expect(markup.inline_keyboard[0][0].style).toBe('danger');
    });
  });

  describe('.row(...buttons)', () => {
    it('lays exactly those buttons into one row, ignoring .columns', () => {
      const markup = new InlineKeyboard()
        .columns(1)
        .row(
          Button.text('A', 'a'),
          Button.text('B', 'b'),
          Button.text('C', 'c'),
        )
        .toJSON();

      expect(markup.inline_keyboard).toEqual([
        [
          { text: 'A', callback_data: 'a' },
          { text: 'B', callback_data: 'b' },
          { text: 'C', callback_data: 'c' },
        ],
      ]);
    });

    it('reads as map body + an explicit footer row', () => {
      const markup = new InlineKeyboard()
        .columns(2)
        .map([1, 2], (n) => Button.text(`#${n}`, `n/${n}`))
        .row(Button.url('Help', 'https://x.dev'))
        .toJSON();

      expect(markup.inline_keyboard).toEqual([
        [
          { text: '#1', callback_data: 'n/1' },
          { text: '#2', callback_data: 'n/2' },
        ],
        [{ text: 'Help', url: 'https://x.dev' }],
      ]);
    });
  });

  describe('full-type fluent shortcuts', () => {
    it('webApp / switchInline / switchInlineCurrent / copyText', () => {
      const markup = new InlineKeyboard()
        .webApp('App', 'https://app.dev')
        .switchInline('Share', 'q')
        .switchInlineCurrent('Here')
        .copyText('Copy', 'CODE')
        .toJSON();

      expect(markup.inline_keyboard[0]).toEqual([
        { text: 'App', web_app: { url: 'https://app.dev' } },
        { text: 'Share', switch_inline_query: 'q' },
        { text: 'Here', switch_inline_query_current_chat: '' },
        { text: 'Copy', copy_text: { text: 'CODE' } },
      ]);
    });

    it('honours the trailing hidden flag', () => {
      const markup = new InlineKeyboard()
        .webApp('App', 'https://app.dev', true)
        .toJSON();

      expect(markup.inline_keyboard).toEqual([]);
    });
  });
});

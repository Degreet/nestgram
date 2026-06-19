import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';
import { NOOP_CALLBACK_DATA } from './noop.constants';

describe('InlineKeyboard — Button sugar', () => {
  describe('.map', () => {
    it('turns a collection into buttons, laid into a grid by .split', () => {
      const items = [
        { id: 1, name: 'Milk' },
        { id: 2, name: 'Bread' },
        { id: 3, name: 'Eggs' },
      ];

      const markup = new InlineKeyboard()
        .map(items, (i) => Button.text(i.name, 'pick/:id', { id: i.id }))
        .split(2)
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

    it('.map().split() equals .text().text().split()', () => {
      const viaMap = new InlineKeyboard()
        .map([1, 2, 3], (n) => Button.text(`#${n}`, `n/${n}`))
        .split(2)
        .toJSON();
      const viaText = new InlineKeyboard()
        .text('#1', 'n/1')
        .text('#2', 'n/2')
        .text('#3', 'n/3')
        .split(2)
        .toJSON();

      expect(viaMap).toEqual(viaText);
    });

    it('drops an item when the callback returns falsy', () => {
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

    it('filters per item with Button.if(...)', () => {
      const products = [
        { id: 1, name: 'A', inStock: true },
        { id: 2, name: 'B', inStock: false },
      ];

      const markup = new InlineKeyboard()
        .map(products, (p) =>
          Button.text(p.name, 'buy/:id', { id: p.id }).if(p.inStock),
        )
        .toJSON();

      expect(markup.inline_keyboard[0]).toEqual([
        { text: 'A', callback_data: 'buy/1' },
      ]);
    });

    it('replaces a hidden button with its .else() fallback', () => {
      const markup = new InlineKeyboard()
        .map(
          [
            { id: 1, name: 'A', inStock: true },
            { id: 2, name: 'B', inStock: false },
          ],
          (p) =>
            Button.text(p.name, 'buy/:id', { id: p.id })
              .if(p.inStock)
              .else('Sold out'),
        )
        .toJSON();

      expect(markup.inline_keyboard[0]).toEqual([
        { text: 'A', callback_data: 'buy/1' },
        { text: 'Sold out', callback_data: NOOP_CALLBACK_DATA },
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

    it('keeps a styled Button value', () => {
      const markup = new InlineKeyboard()
        .add(Button.text('Delete', 'del').danger())
        .toJSON();

      expect(markup.inline_keyboard[0][0].style).toBe('danger');
    });
  });

  describe('.group', () => {
    it('appends an irregular block of rows', () => {
      const markup = new InlineKeyboard()
        .text('Home', 'home')
        .row()
        .group((kb) =>
          kb
            .text('a', 'a')
            .text('b', 'b')
            .text('c', 'c')
            .row()
            .text('d', 'd')
            .row(),
        )
        .toJSON();

      expect(markup.inline_keyboard).toEqual([
        [{ text: 'Home', callback_data: 'home' }],
        [
          { text: 'a', callback_data: 'a' },
          { text: 'b', callback_data: 'b' },
          { text: 'c', callback_data: 'c' },
        ],
        [{ text: 'd', callback_data: 'd' }],
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
  });
});

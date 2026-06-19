import { Button } from './button';
import { NOOP_CALLBACK_DATA } from './noop.constants';

describe('Button', () => {
  describe('constructors map to the Bot API button shape', () => {
    it('text — assembles a callback route with parameters', () => {
      expect(
        Button.text('Done', 'reminder/done/:id', { id: 42 }).toJSON(),
      ).toEqual({ text: 'Done', callback_data: 'reminder/done/42' });
    });

    it('text — keeps a parameterless route as the literal callback_data', () => {
      expect(Button.text('Refresh', 'refresh').toJSON()).toEqual({
        text: 'Refresh',
        callback_data: 'refresh',
      });
    });

    it('toggle — prepends a ✅ when on and routes like text', () => {
      expect(
        Button.toggle(true, 'Email', 'pick/:id', { id: 'e' }).toJSON(),
      ).toEqual({ text: '✅ Email', callback_data: 'pick/e' });
    });

    it('toggle — no marker when off', () => {
      expect(
        Button.toggle(false, 'Email', 'pick/:id', { id: 'e' }).toJSON(),
      ).toEqual({ text: 'Email', callback_data: 'pick/e' });
    });

    it('url / webApp / loginUrl', () => {
      expect(Button.url('Docs', 'https://x.dev').toJSON()).toEqual({
        text: 'Docs',
        url: 'https://x.dev',
      });
      expect(Button.webApp('Open', 'https://app.dev').toJSON()).toEqual({
        text: 'Open',
        web_app: { url: 'https://app.dev' },
      });
      expect(Button.loginUrl('Sign in', 'https://auth.dev').toJSON()).toEqual({
        text: 'Sign in',
        login_url: { url: 'https://auth.dev' },
      });
    });

    it('switchInline / switchInlineCurrent / copyText / pay', () => {
      expect(Button.switchInline('Share', 'hi').toJSON()).toEqual({
        text: 'Share',
        switch_inline_query: 'hi',
      });
      expect(Button.switchInlineCurrent('Here').toJSON()).toEqual({
        text: 'Here',
        switch_inline_query_current_chat: '',
      });
      expect(Button.copyText('Copy', 'ABC123').toJSON()).toEqual({
        text: 'Copy',
        copy_text: { text: 'ABC123' },
      });
      expect(Button.pay('Pay').toJSON()).toEqual({ text: 'Pay', pay: true });
    });
  });

  describe('styling returns a copy, never mutating the original', () => {
    it('stamps the style on the copy and leaves the source unstyled', () => {
      const base = Button.text('Delete', 'del/:id', { id: 1 });
      const danger = base.danger();

      expect(danger.toJSON()).toEqual({
        text: 'Delete',
        callback_data: 'del/1',
        style: 'danger',
      });
      expect(base.toJSON().style).toBeUndefined();
    });
  });

  describe('introspection and adoption', () => {
    it('exposes label and callbackData', () => {
      const button = Button.text('Buy', 'buy/:id', { id: 7 });
      expect(button.label).toBe('Buy');
      expect(button.callbackData).toBe('buy/7');
      expect(Button.url('Docs', 'https://x.dev').callbackData).toBeUndefined();
    });

    it('withText() returns a relabelled copy, keeping the rest', () => {
      const base = Button.text('☐ Milk', 'toggle/:id', { id: 1 });
      const checked = base.withText('☑ Milk');

      expect(checked.toJSON()).toEqual({
        text: '☑ Milk',
        callback_data: 'toggle/1',
      });
      expect(base.label).toBe('☐ Milk');
    });

    it('from() adopts a raw Telegram button as a value', () => {
      const raw = { text: 'Old', callback_data: 'toggle/3' };
      const button = Button.from(raw);

      expect(button.label).toBe('Old');
      expect(button.callbackData).toBe('toggle/3');
      // A copy — mutating the returned JSON does not touch the source.
      button.toJSON().text = 'Changed';
      expect(raw.text).toBe('Old');
    });
  });

  describe('conditional (.if / .else) and noop', () => {
    const buy = Button.text('Buy', 'buy/:id', { id: 1 });

    it('resolve() returns the button itself when .if(true)', () => {
      const shown = buy.if(true);
      expect(shown.resolve()).toBe(shown);
      expect(shown.resolve()?.toJSON()).toEqual({
        text: 'Buy',
        callback_data: 'buy/1',
      });
    });

    it('resolve() is null when .if(false) with no fallback', () => {
      expect(buy.if(false).resolve()).toBeNull();
    });

    it('.else(label) yields a noop dead-end button when hidden', () => {
      expect(buy.if(false).else('Sold out').resolve()?.toJSON()).toEqual({
        text: 'Sold out',
        callback_data: NOOP_CALLBACK_DATA,
      });
    });

    it('.else(Button) yields the given fallback when hidden', () => {
      const fallback = Button.url('Notify', 'https://x.dev');
      expect(buy.if(false).else(fallback).resolve()).toBe(fallback);
    });

    it('an unhidden button ignores its .else()', () => {
      expect(buy.if(true).else('Sold out').resolve()?.label).toBe('Buy');
    });

    it('Button.noop(label) is a dead-end button', () => {
      expect(Button.noop('Nothing').toJSON()).toEqual({
        text: 'Nothing',
        callback_data: NOOP_CALLBACK_DATA,
      });
    });
  });
});

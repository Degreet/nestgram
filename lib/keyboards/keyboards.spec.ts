import { Button } from './button';
import { InlineKeyboard } from './inline-keyboard';
import { ReplyKeyboard } from './reply-keyboard';
import { RemoveKeyboard } from './remove-keyboard';
import { createAttachedData } from '../api/form-data';
import { CallbackRoutePattern } from '../callback-data';
import { NestgramConfigError } from '../exceptions';

// Serialize the way a send payload does: JSON.stringify invokes toJSON().
function serialize(markup: unknown): unknown {
  return JSON.parse(JSON.stringify(markup));
}

describe('InlineKeyboard layout', () => {
  it('commits accumulated buttons as a row with .row()', () => {
    const kb = new InlineKeyboard()
      .text('Buy', 'buy:1')
      .text('Info', 'info:1')
      .row()
      .url('Website', 'https://nestgram.com');

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'Buy', callback_data: 'buy:1' },
          { text: 'Info', callback_data: 'info:1' },
        ],
        [{ text: 'Website', url: 'https://nestgram.com' }],
      ],
    });
  });

  it('flushes leftover accumulated buttons as a final row', () => {
    const kb = new InlineKeyboard().text('Only', 'x');
    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'Only', callback_data: 'x' }]],
    });
  });

  it('serializes identically through the form-data path', async () => {
    const kb = new InlineKeyboard().text('Buy', 'buy:1');
    const formData = await createAttachedData({ reply_markup: kb });
    expect(JSON.parse(formData.get('reply_markup') as string)).toEqual(
      serialize(kb),
    );
  });

  it('.split(n) cuts the accumulated buttons into rows of n (uneven last row)', () => {
    const kb = new InlineKeyboard()
      .text('a', '1')
      .text('b', '2')
      .text('c', '3')
      .text('d', '4')
      .text('e', '5')
      .split(2);

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'a', callback_data: '1' },
          { text: 'b', callback_data: '2' },
        ],
        [
          { text: 'c', callback_data: '3' },
          { text: 'd', callback_data: '4' },
        ],
        [{ text: 'e', callback_data: '5' }],
      ],
    });
  });

  it('.spread() lays one button per row', () => {
    const kb = new InlineKeyboard().text('a', '1').text('b', '2').spread();
    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [{ text: 'a', callback_data: '1' }],
        [{ text: 'b', callback_data: '2' }],
      ],
    });
  });

  it('each .split() is its own section — different widths compose', () => {
    const kb = new InlineKeyboard()
      .text('a', '1')
      .text('b', '2')
      .split(2)
      .text('c', '3')
      .text('d', '4')
      .text('e', '5')
      .split(3);

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'a', callback_data: '1' },
          { text: 'b', callback_data: '2' },
        ],
        [
          { text: 'c', callback_data: '3' },
          { text: 'd', callback_data: '4' },
          { text: 'e', callback_data: '5' },
        ],
      ],
    });
  });

  it('.split(0) is rejected', () => {
    expect(() => new InlineKeyboard().text('a', '1').split(0)).toThrow(
      NestgramConfigError,
    );
  });

  it('.row(...buttons) commits an explicit row', () => {
    const kb = new InlineKeyboard().row(
      Button.text('A', 'a'),
      Button.text('B', 'b'),
    );
    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'A', callback_data: 'a' },
          { text: 'B', callback_data: 'b' },
        ],
      ],
    });
  });
});

describe('InlineKeyboard colours (postfix)', () => {
  it('styles the just-added button', () => {
    const kb = new InlineKeyboard()
      .text('Buy', 'buy')
      .primary()
      .text('Info', 'info')
      .url('Cancel', 'https://x')
      .danger();

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'Buy', callback_data: 'buy', style: 'primary' },
          { text: 'Info', callback_data: 'info' },
          { text: 'Cancel', url: 'https://x', style: 'danger' },
        ],
      ],
    });
  });

  it('exposes all three styles', () => {
    const kb = new InlineKeyboard()
      .text('p', '1')
      .primary()
      .text('s', '2')
      .success()
      .text('d', '3')
      .danger();

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'p', callback_data: '1', style: 'primary' },
          { text: 's', callback_data: '2', style: 'success' },
          { text: 'd', callback_data: '3', style: 'danger' },
        ],
      ],
    });
  });
});

describe('InlineKeyboard .if() conditionals', () => {
  it('drops the last button when false, keeps it when true', () => {
    const kb = new InlineKeyboard()
      .text('keep', 'k')
      .text('admin', 'a')
      .if(false)
      .text('also', 'b')
      .if(true);

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'keep', callback_data: 'k' },
          { text: 'also', callback_data: 'b' },
        ],
      ],
    });
  });

  it('consumes the unit, so a passing .if() is not re-targeted by a later .if()', () => {
    const kb = new InlineKeyboard()
      .text('a', 'a')
      .if(true)
      .if(false) // targets nothing — the button above was already kept
      .split(1);

    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'a', callback_data: 'a' }]],
    });
  });

  it('drops a whole row when false', () => {
    const kb = new InlineKeyboard()
      .text('top', 't')
      .row()
      .row(Button.text('secret', 's'))
      .if(false);

    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'top', callback_data: 't' }]],
    });
  });

  it('drops a whole split section when false', () => {
    const kb = new InlineKeyboard()
      .text('a', '1')
      .text('b', '2')
      .split(2)
      .text('x', 'x')
      .text('y', 'y')
      .split(2)
      .if(false);

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'a', callback_data: '1' },
          { text: 'b', callback_data: '2' },
        ],
      ],
    });
  });

  it('drops a whole group when false (irregular admin section)', () => {
    const build = (isAdmin: boolean) =>
      new InlineKeyboard()
        .text('Home', 'home')
        .row()
        .group((kb) =>
          kb
            .row(Button.text('a', 'a'), Button.text('b', 'b'))
            .row(Button.text('c', 'c')),
        )
        .if(isAdmin);

    expect(serialize(build(false))).toEqual({
      inline_keyboard: [[{ text: 'Home', callback_data: 'home' }]],
    });
    expect(serialize(build(true))).toEqual({
      inline_keyboard: [
        [{ text: 'Home', callback_data: 'home' }],
        [
          { text: 'a', callback_data: 'a' },
          { text: 'b', callback_data: 'b' },
        ],
        [{ text: 'c', callback_data: 'c' }],
      ],
    });
  });
});

describe('ReplyKeyboard', () => {
  it('builds rows with resize/one-time/placeholder flags', () => {
    const kb = new ReplyKeyboard()
      .text('My orders')
      .row()
      .text('Help')
      .resize()
      .oneTime()
      .placeholder('Pick one');

    expect(serialize(kb)).toEqual({
      keyboard: [[{ text: 'My orders' }], [{ text: 'Help' }]],
      resize_keyboard: true,
      one_time_keyboard: true,
      input_field_placeholder: 'Pick one',
    });
  });

  it('.split(n) lays a grid', () => {
    const kb = new ReplyKeyboard().text('a').text('b').text('c').split(2);

    expect(serialize(kb)).toEqual({
      keyboard: [[{ text: 'a' }, { text: 'b' }], [{ text: 'c' }]],
    });
  });

  it('omits unset flags', () => {
    const kb = new ReplyKeyboard().text('Hi');
    expect(serialize(kb)).toEqual({ keyboard: [[{ text: 'Hi' }]] });
  });

  it('styles a button via a postfix colour modifier', () => {
    const kb = new ReplyKeyboard().text('Confirm').success().text('Plain');
    expect(serialize(kb)).toEqual({
      keyboard: [[{ text: 'Confirm', style: 'success' }, { text: 'Plain' }]],
    });
  });

  it('covers the request/web_app button kinds', () => {
    const kb = new ReplyKeyboard()
      .requestContact('Phone')
      .requestLocation('Where')
      .row()
      .requestPoll('Quiz', 'quiz')
      .webApp('App', 'https://app.dev')
      .row()
      .requestUsers('Pick', { request_id: 1, max_quantity: 3 })
      .requestChat('Chat', { request_id: 2, chat_is_channel: false })
      .row();

    expect(serialize(kb)).toEqual({
      keyboard: [
        [
          { text: 'Phone', request_contact: true },
          { text: 'Where', request_location: true },
        ],
        [
          { text: 'Quiz', request_poll: { type: 'quiz' } },
          { text: 'App', web_app: { url: 'https://app.dev' } },
        ],
        [
          { text: 'Pick', request_users: { request_id: 1, max_quantity: 3 } },
          {
            text: 'Chat',
            request_chat: { request_id: 2, chat_is_channel: false },
          },
        ],
      ],
    });
  });

  it('persistent maps to is_persistent', () => {
    const kb = new ReplyKeyboard().text('Hi').persistent();
    expect(serialize(kb)).toEqual({
      keyboard: [[{ text: 'Hi' }]],
      is_persistent: true,
    });
  });
});

describe('InlineKeyboard callback routes (.text assemble form)', () => {
  it('assembles a route from a template and parameters', () => {
    const kb = new InlineKeyboard().text('Done', 'reminder/done/:id', {
      id: 42,
    });
    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'Done', callback_data: 'reminder/done/42' }]],
    });
  });

  it('escapes a parameter value that contains the separator', () => {
    const kb = new InlineKeyboard().text('Open', 'open/:slug', { slug: 'a/b' });
    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'Open', callback_data: 'open/a\\/b' }]],
    });
  });

  it('round-trips a parameter value containing the escape character', () => {
    const kb = new InlineKeyboard().text('Open', 'open/:slug', {
      slug: 'a\\b',
    });
    const json = serialize(kb) as {
      inline_keyboard: { callback_data: string }[][];
    };
    const data = json.inline_keyboard[0][0].callback_data;
    expect(CallbackRoutePattern.compile('open/:slug').match(data)).toEqual({
      slug: 'a\\b',
    });
  });

  it('passes an interpolated string through unchanged (terse form)', () => {
    const id = 7;
    const kb = new InlineKeyboard().text('Done', `reminder/done/${id}`);
    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'Done', callback_data: 'reminder/done/7' }]],
    });
  });

  it('requires every parameter at the type level', () => {
    // Compile-time assertions only — declared, never invoked.
    const assertTypes = () => {
      // @ts-expect-error — missing the `id` parameter the template declares.
      new InlineKeyboard().text('Done', 'reminder/done/:id');
      // @ts-expect-error — `id` is not among the template's parameters.
      new InlineKeyboard().text('Done', 'reminder/done/:id', { wrong: 1 });
    };
    expect(typeof assertTypes).toBe('function');
  });
});

describe('RemoveKeyboard', () => {
  it('serializes to remove_keyboard', () => {
    expect(serialize(new RemoveKeyboard())).toEqual({ remove_keyboard: true });
  });

  it('supports selective', () => {
    expect(serialize(new RemoveKeyboard().selective())).toEqual({
      remove_keyboard: true,
      selective: true,
    });
  });
});

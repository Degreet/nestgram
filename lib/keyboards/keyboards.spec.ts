import { InlineKeyboard } from './inline-keyboard';
import { ReplyKeyboard } from './reply-keyboard';
import { RemoveKeyboard } from './remove-keyboard';
import { createAttachedData } from '../api/form-data';
import { NestgramConfigError } from '../exceptions';

// Serialize the way a send payload does: JSON.stringify invokes toJSON().
function serialize(markup: unknown): unknown {
  return JSON.parse(JSON.stringify(markup));
}

describe('InlineKeyboard', () => {
  it('lays buttons into rows', () => {
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

  it('drops empty trailing rows', () => {
    const kb = new InlineKeyboard().text('Only', 'x').row();
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

  it('columns(n) auto-wraps buttons into a grid (uneven last row)', () => {
    const kb = new InlineKeyboard()
      .columns(2)
      .text('a', '1')
      .text('b', '2')
      .text('c', '3')
      .text('d', '4')
      .text('e', '5');

    expect(
      (serialize(kb) as { inline_keyboard: unknown[][] }).inline_keyboard,
    ).toHaveLength(3);
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

  it('columns coexists with an explicit row()', () => {
    const kb = new InlineKeyboard()
      .text('top', 't')
      .row()
      .columns(2)
      .text('a', '1')
      .text('b', '2')
      .text('c', '3');

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [{ text: 'top', callback_data: 't' }],
        [
          { text: 'a', callback_data: '1' },
          { text: 'b', callback_data: '2' },
        ],
        [{ text: 'c', callback_data: '3' }],
      ],
    });
  });

  it('columns set mid-row counts buttons already in that row', () => {
    const kb = new InlineKeyboard()
      .text('a', '1')
      .columns(2)
      .text('b', '2')
      .text('c', '3');

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [
          { text: 'a', callback_data: '1' },
          { text: 'b', callback_data: '2' },
        ],
        [{ text: 'c', callback_data: '3' }],
      ],
    });
  });

  it('columns(0) is rejected', () => {
    expect(() => new InlineKeyboard().columns(0)).toThrow(NestgramConfigError);
  });

  it('hidden buttons are excluded (and an all-hidden row collapses)', () => {
    const kb = new InlineKeyboard()
      .text('keep', 'k')
      .text('drop', 'd', true)
      .row()
      .text('gone', 'g', 1 > 0) // any boolean expression
      .row()
      .text('last', 'l');

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [{ text: 'keep', callback_data: 'k' }],
        [{ text: 'last', callback_data: 'l' }],
      ],
    });
  });

  it('a colour modifier styles the next button only (one-shot)', () => {
    const kb = new InlineKeyboard()
      .primary()
      .text('Buy', 'buy')
      .text('Info', 'info')
      .danger()
      .url('Cancel', 'https://x');

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
      .primary()
      .text('p', '1')
      .success()
      .text('s', '2')
      .danger()
      .text('d', '3');

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

  it('a hidden styled button does not leak its style onto the next', () => {
    const kb = new InlineKeyboard()
      .danger()
      .text('drop', 'd', true)
      .text('keep', 'k');

    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'keep', callback_data: 'k' }]],
    });
  });

  it('a colour modifier attaches to the next button across a row break', () => {
    const kb = new InlineKeyboard().primary().row().text('X', 'x');
    expect(serialize(kb)).toEqual({
      inline_keyboard: [[{ text: 'X', callback_data: 'x', style: 'primary' }]],
    });
  });

  it('a styled button keeps its style when columns wraps it to a new row', () => {
    const kb = new InlineKeyboard()
      .columns(1)
      .text('a', '1')
      .danger()
      .text('b', '2');

    expect(serialize(kb)).toEqual({
      inline_keyboard: [
        [{ text: 'a', callback_data: '1' }],
        [{ text: 'b', callback_data: '2', style: 'danger' }],
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

  it('supports columns grid and hidden buttons', () => {
    const kb = new ReplyKeyboard()
      .columns(2)
      .text('a')
      .text('skip', true)
      .text('b')
      .text('c');

    expect(serialize(kb)).toEqual({
      keyboard: [[{ text: 'a' }, { text: 'b' }], [{ text: 'c' }]],
    });
  });

  it('omits unset flags', () => {
    const kb = new ReplyKeyboard().text('Hi');
    expect(serialize(kb)).toEqual({ keyboard: [[{ text: 'Hi' }]] });
  });

  it('styles a button via a colour modifier', () => {
    const kb = new ReplyKeyboard().success().text('Confirm').text('Plain');
    expect(serialize(kb)).toEqual({
      keyboard: [[{ text: 'Confirm', style: 'success' }, { text: 'Plain' }]],
    });
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

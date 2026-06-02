import { InlineKeyboard } from './inline-keyboard';
import { ReplyKeyboard } from './reply-keyboard';
import { RemoveKeyboard } from './remove-keyboard';
import { createAttachedData } from '../api/form-data';

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

  it('omits unset flags', () => {
    const kb = new ReplyKeyboard().text('Hi');
    expect(serialize(kb)).toEqual({ keyboard: [[{ text: 'Hi' }]] });
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

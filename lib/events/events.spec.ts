import { Logger } from '@nestjs/common';

import { Message } from './message';
import { CallbackQuery } from './callback-query';
import { BotService } from '../api';

interface Call {
  method: string;
  args: unknown[];
}

function fakeBot(): { bot: BotService; calls: Call[] } {
  const calls: Call[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return Promise.resolve();
    };

  const bot = {
    token: 'TEST',
    sendMessage: record('sendMessage'),
    answerCallbackQuery: record('answerCallbackQuery'),
    editMessageText: record('editMessageText'),
    editMessageReplyMarkup: record('editMessageReplyMarkup'),
    deleteMessage: record('deleteMessage'),
    forwardMessage: record('forwardMessage'),
    copyMessage: record('copyMessage'),
  } as unknown as BotService;

  return { bot, calls };
}

describe('Message actions', () => {
  function message(bot: BotService): Message {
    return new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'private' },
      text: 'hi',
    });
  }

  it('answer() sends a message to the same chat', () => {
    const { bot, calls } = fakeBot();
    message(bot).answer('hello');
    expect(calls[0]).toEqual({
      method: 'sendMessage',
      args: [1, 'hello', undefined],
    });
  });

  it('reply() quotes the original message', () => {
    const { bot, calls } = fakeBot();
    message(bot).reply('hello');
    expect(calls[0]).toEqual({
      method: 'sendMessage',
      args: [1, 'hello', { reply_parameters: { message_id: 5 } }],
    });
  });

  it('editText() edits this message', () => {
    const { bot, calls } = fakeBot();
    message(bot).editText('updated');
    expect(calls[0]).toEqual({
      method: 'editMessageText',
      args: [1, 5, 'updated', undefined],
    });
  });

  it('editText() takes a rich message in the content slot', () => {
    const { bot, calls } = fakeBot();
    message(bot).editText({ markdown: '# updated' });
    expect(calls[0]).toEqual({
      method: 'editMessageText',
      args: [1, 5, { markdown: '# updated' }, undefined],
    });
  });

  it('editReplyMarkup() edits this message keyboard', () => {
    const { bot, calls } = fakeBot();
    const markup = { inline_keyboard: [] };
    message(bot).editReplyMarkup(markup);
    expect(calls[0]).toEqual({
      method: 'editMessageReplyMarkup',
      args: [1, 5, { reply_markup: markup }],
    });
  });

  it('delete() removes this message', () => {
    const { bot, calls } = fakeBot();
    message(bot).delete();
    expect(calls[0]).toEqual({
      method: 'deleteMessage',
      args: [1, 5, undefined],
    });
  });

  it('forward() forwards this message to another chat', () => {
    const { bot, calls } = fakeBot();
    message(bot).forward(99);
    expect(calls[0]).toEqual({
      method: 'forwardMessage',
      args: [99, 1, 5, undefined],
    });
  });

  it('copy() copies this message to another chat', () => {
    const { bot, calls } = fakeBot();
    message(bot).copy(99);
    expect(calls[0]).toEqual({
      method: 'copyMessage',
      args: [99, 1, 5, undefined],
    });
  });
});

describe('CallbackQuery actions', () => {
  function query(bot: BotService): CallbackQuery {
    return new CallbackQuery(bot, {
      id: 'cb1',
      chat_instance: 'x',
    });
  }

  it('answer(text, options) answers with a toast', () => {
    const { bot, calls } = fakeBot();
    query(bot).answer('Saved!', { show_alert: true });
    expect(calls[0]).toEqual({
      method: 'answerCallbackQuery',
      args: ['cb1', { text: 'Saved!', show_alert: true }],
    });
  });

  it('answer() with no text just stops the spinner', () => {
    const { bot, calls } = fakeBot();
    query(bot).answer();
    expect(calls[0]).toEqual({
      method: 'answerCallbackQuery',
      args: ['cb1', { text: undefined }],
    });
  });

  it('alert(text) answers with show_alert', () => {
    const { bot, calls } = fakeBot();
    query(bot).alert('Heads up');
    expect(calls[0]).toEqual({
      method: 'answerCallbackQuery',
      args: ['cb1', { show_alert: true, text: 'Heads up' }],
    });
  });

  it('leaves message undefined for inline-mode queries (no hollow wrap)', () => {
    const { bot } = fakeBot();
    const q = new CallbackQuery(bot, {
      id: 'cb1',
      chat_instance: 'x',
      inline_message_id: 'im1',
    });
    expect(q.message).toBeUndefined();
  });

  it('wraps the originating message into a rich Message when present', () => {
    const { bot } = fakeBot();
    const q = new CallbackQuery(bot, {
      id: 'cb1',
      chat_instance: 'x',
      message: { message_id: 5, chat: { id: 1, type: 'private' }, date: 0 },
    });
    expect(q.message).toBeInstanceOf(Message);
    expect(q.message?.chat.id).toBe(1);
  });

  it('tracks answered via per-update state and warns on a double answer', () => {
    const { bot } = fakeBot();
    const state = new Map();
    const q = new CallbackQuery(bot, { id: 'cb1', chat_instance: 'x' }, state);
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    expect(q.isAnswered).toBe(false);
    q.answer();
    expect(q.isAnswered).toBe(true);
    q.answer();

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('more than once'),
    );
    warn.mockRestore();
  });
});

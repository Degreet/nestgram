import { Logger } from '@nestjs/common';

import { Message } from './message';
import { CallbackQuery } from './callback-query';
import { BotService, MediaGroup } from '../api';
import { NestgramError } from '../exceptions';
import type { RawInlineQueryResult } from './raw-update.types';

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
    answerGuestQuery: record('answerGuestQuery'),
    answerCallbackQuery: record('answerCallbackQuery'),
    editMessageText: record('editMessageText'),
    editMessageReplyMarkup: record('editMessageReplyMarkup'),
    editMessageMedia: record('editMessageMedia'),
    deleteMessage: record('deleteMessage'),
    forwardMessage: record('forwardMessage'),
    copyMessage: record('copyMessage'),
    sendVideo: record('sendVideo'),
    sendAudio: record('sendAudio'),
    sendDocument: record('sendDocument'),
    sendAnimation: record('sendAnimation'),
    sendVoice: record('sendVoice'),
    sendVideoNote: record('sendVideoNote'),
    sendSticker: record('sendSticker'),
    setMessageReaction: record('setMessageReaction'),
    sendMediaGroup: record('sendMediaGroup'),
    streamMessage: record('streamMessage'),
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

  function guestMessage(bot: BotService): Message {
    return new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'private' },
      text: 'table for two?',
      guest_query_id: 'gq_1',
    });
  }

  it('answer() refuses a guest message (its chat id may not be reachable)', () => {
    const { bot, calls } = fakeBot();
    expect(() => guestMessage(bot).answer('hi')).toThrow(NestgramError);
    expect(calls).toHaveLength(0);
  });

  it('answerGuest() replies via answerGuestQuery with the guest_query_id', () => {
    const { bot, calls } = fakeBot();
    const result = {
      type: 'article',
      id: '1',
      title: 'Booked',
      input_message_content: { message_text: 'Table for two, confirmed.' },
    } as RawInlineQueryResult;

    guestMessage(bot).answerGuest(result);

    expect(calls[0]).toEqual({
      method: 'answerGuestQuery',
      args: ['gq_1', result, undefined],
    });
  });

  it('answerGuest() throws on a non-guest message', () => {
    const { bot, calls } = fakeBot();
    expect(() => message(bot).answerGuest({} as RawInlineQueryResult)).toThrow(
      NestgramError,
    );
    expect(calls).toHaveLength(0);
  });

  it('reply() quotes the original message', () => {
    const { bot, calls } = fakeBot();
    message(bot).reply('hello');
    expect(calls[0]).toEqual({
      method: 'sendMessage',
      args: [1, 'hello', { reply_parameters: { message_id: 5 } }],
    });
  });

  it('answerStream() streams to the same chat', () => {
    const { bot, calls } = fakeBot();
    const source = (async function* () {
      yield 'x';
    })();
    message(bot).answerStream(source, { format: 'html' });
    expect(calls[0]).toEqual({
      method: 'streamMessage',
      args: [1, source, { format: 'html' }],
    });
  });

  it('replyStream() quotes the original message', () => {
    const { bot, calls } = fakeBot();
    const source = (async function* () {
      yield 'x';
    })();
    message(bot).replyStream(source);
    expect(calls[0]).toEqual({
      method: 'streamMessage',
      args: [1, source, { reply_parameters: { message_id: 5 } }],
    });
  });

  it('answerStream() refuses a guest message', () => {
    const { bot, calls } = fakeBot();
    const source = (async function* () {
      yield 'x';
    })();
    expect(() => guestMessage(bot).answerStream(source)).toThrow(NestgramError);
    expect(calls).toHaveLength(0);
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

  it('editMedia() edits this message media in place', () => {
    const { bot, calls } = fakeBot();
    const media = { type: 'photo' as const, media: 'file_id' };
    message(bot).editMedia(media);
    expect(calls[0]).toEqual({
      method: 'editMessageMedia',
      args: [1, 5, media, undefined],
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

  it('answerVideo() sends a video to the same chat', () => {
    const { bot, calls } = fakeBot();
    message(bot).answerVideo('file_id', { caption: 'hi' });
    expect(calls[0]).toEqual({
      method: 'sendVideo',
      args: [1, 'file_id', { caption: 'hi' }],
    });
  });

  it('answerSticker() sends a sticker to the same chat', () => {
    const { bot, calls } = fakeBot();
    message(bot).answerSticker('sticker_id');
    expect(calls[0]).toEqual({
      method: 'sendSticker',
      args: [1, 'sticker_id', undefined],
    });
  });

  it('replyDocument() quotes the original message', () => {
    const { bot, calls } = fakeBot();
    message(bot).replyDocument('doc_id');
    expect(calls[0]).toEqual({
      method: 'sendDocument',
      args: [1, 'doc_id', { reply_parameters: { message_id: 5 } }],
    });
  });

  it('react() sets a single emoji reaction on this message', () => {
    const { bot, calls } = fakeBot();
    message(bot).react('🔥');
    expect(calls[0]).toEqual({
      method: 'setMessageReaction',
      args: [1, 5, { reaction: [{ type: 'emoji', emoji: '🔥' }] }],
    });
  });

  it('answerMediaGroup() accepts a raw item array', () => {
    const { bot, calls } = fakeBot();
    const media = [{ type: 'photo' as const, media: 'p1' }];
    message(bot).answerMediaGroup(media);
    expect(calls[0]).toEqual({
      method: 'sendMediaGroup',
      args: [1, media, undefined],
    });
  });

  it('answerMediaGroup() unwraps a MediaGroup builder to its items', () => {
    const { bot, calls } = fakeBot();
    message(bot).answerMediaGroup(new MediaGroup().photo('p1').video('v1'));
    expect(calls[0]).toEqual({
      method: 'sendMediaGroup',
      args: [
        1,
        [
          { type: 'photo', media: 'p1' },
          { type: 'video', media: 'v1' },
        ],
        undefined,
      ],
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

describe('Message entities', () => {
  function mentioning(bot: BotService): Message {
    return new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'supergroup' },
      text: 'hey @my_bot and @someone_else',
      entities: [
        { type: 'mention', offset: 4, length: 7 },
        { type: 'mention', offset: 16, length: 13 },
      ],
    });
  }

  it('entitiesOf() returns the entities of a type with their text sliced', () => {
    const { bot } = fakeBot();
    expect(
      mentioning(bot)
        .entitiesOf('mention')
        .map((e) => e.text),
    ).toEqual(['@my_bot', '@someone_else']);
  });

  it('hasEntity(type) is true when any entity of the type is present', () => {
    const { bot } = fakeBot();
    expect(mentioning(bot).hasEntity('mention')).toBe(true);
    expect(mentioning(bot).hasEntity('hashtag')).toBe(false);
  });

  it('hasEntity({ type, text }) matches the exact entity text', () => {
    const { bot } = fakeBot();
    expect(
      mentioning(bot).hasEntity({ type: 'mention', text: '@my_bot' }),
    ).toBe(true);
    expect(
      mentioning(bot).hasEntity({ type: 'mention', text: '@nobody' }),
    ).toBe(false);
  });

  it('mentions() matches case-insensitively, with @ optional', () => {
    const { bot } = fakeBot();
    const message = new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'supergroup' },
      text: 'ping @My_Bot',
      entities: [{ type: 'mention', offset: 5, length: 7 }],
    });
    expect(message.mentions('my_bot')).toBe(true); // no @, different case
    expect(message.mentions('@MY_BOT')).toBe(true); // leading @, upper case
    expect(message.mentions('someone_else')).toBe(false);
  });

  it('html/markdown render the message back from its entities', () => {
    const { bot } = fakeBot();
    const message = new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'private' },
      text: 'hello world',
      entities: [{ type: 'bold', offset: 6, length: 5 }],
    });
    expect(message.html).toBe('hello <b>world</b>');
    expect(message.markdown).toBe('hello *world*');
  });

  it('html renders from the caption for a media message', () => {
    const { bot } = fakeBot();
    const message = new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'private' },
      caption: 'nice pic',
      caption_entities: [{ type: 'italic', offset: 5, length: 3 }],
    });
    expect(message.html).toBe('nice <i>pic</i>');
  });

  it('html is empty when there is no text or caption', () => {
    const { bot } = fakeBot();
    const message = new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'private' },
    });
    expect(message.html).toBe('');
  });
});

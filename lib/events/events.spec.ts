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
  } as unknown as BotService;

  return { bot, calls };
}

describe('Message actions', () => {
  function message(bot: BotService): Message {
    return new Message(bot, {
      message_id: 5,
      chat: { id: 1, type: 'private' },
      text: 'hi',
    } as Partial<Message>);
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

  it('editReplyMarkup() edits this message keyboard', () => {
    const { bot, calls } = fakeBot();
    const markup = { inline_keyboard: [] };
    message(bot).editReplyMarkup(markup);
    expect(calls[0]).toEqual({
      method: 'editMessageReplyMarkup',
      args: [1, 5, markup, undefined],
    });
  });
});

describe('CallbackQuery actions', () => {
  function query(bot: BotService): CallbackQuery {
    return new CallbackQuery(bot, {
      id: 'cb1',
      chat_instance: 'x',
    } as Partial<CallbackQuery>);
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
});

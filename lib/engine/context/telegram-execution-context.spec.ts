import { BotService } from '../../api';
import { Message } from '../../events/message';
import { CallbackQuery } from '../../events/callback-query';
import { RawUpdate } from '../../events/raw-update.types';
import { ContextFactory } from './context-factory';
import { EventFactory } from './event-factory';
import { TelegramExecutionContext } from './telegram-execution-context';

function wrap(update: RawUpdate): TelegramExecutionContext {
  const botService = { token: 'TEST' } as unknown as BotService;
  const ctx = new ContextFactory(botService, new EventFactory()).wrap(update);
  if (!ctx) {
    throw new Error('expected a resolvable update');
  }
  return ctx;
}

describe('TelegramExecutionContext.message', () => {
  it('exposes the rich Message for a message-family update', () => {
    const ctx = wrap({
      update_id: 1,
      message: {
        message_id: 1,
        date: 1,
        chat: { id: 99, type: 'supergroup' },
        from: { id: 7, is_bot: false, first_name: 'Alice' },
        text: 'ping @my_bot',
        entities: [{ type: 'mention', offset: 5, length: 7 }],
      },
    });

    expect(ctx.message).toBeInstanceOf(Message);
    // The whole point: a custom predicate reads entities off the rich event.
    expect(ctx.message?.hasEntity({ type: 'mention', text: '@my_bot' })).toBe(
      true,
    );
  });

  it('returns the same cached event as `event` (no second build)', () => {
    const ctx = wrap({
      update_id: 1,
      message: { message_id: 1, date: 1, chat: { id: 1, type: 'private' } },
    });
    expect(ctx.message).toBe(ctx.event);
  });

  it('is undefined for a non-message update', () => {
    const ctx = wrap({
      update_id: 1,
      callback_query: {
        id: 'q',
        from: { id: 42, is_bot: false, first_name: 'Bob' },
        chat_instance: 'c',
        data: 'data',
      },
    });
    expect(ctx.message).toBeUndefined();
  });
});

describe('TelegramExecutionContext.callbackQuery', () => {
  const callbackUpdate: RawUpdate = {
    update_id: 1,
    callback_query: {
      id: 'q',
      from: { id: 42, is_bot: false, first_name: 'Bob' },
      chat_instance: 'c',
      data: 'done/7',
    },
  };

  it('exposes the rich CallbackQuery for a callback update', () => {
    const ctx = wrap(callbackUpdate);
    expect(ctx.callbackQuery).toBeInstanceOf(CallbackQuery);
    expect(ctx.callbackQuery?.data).toBe('done/7');
  });

  it('is undefined for a message update', () => {
    const ctx = wrap({
      update_id: 1,
      message: { message_id: 1, date: 1, chat: { id: 1, type: 'private' } },
    });
    expect(ctx.callbackQuery).toBeUndefined();
  });
});

describe('TelegramExecutionContext.eventOf', () => {
  it('narrows the event to the requested type, else undefined', () => {
    const messageCtx = wrap({
      update_id: 1,
      message: { message_id: 1, date: 1, chat: { id: 1, type: 'private' } },
    });
    expect(messageCtx.eventOf(Message)).toBeInstanceOf(Message);
    expect(messageCtx.eventOf(CallbackQuery)).toBeUndefined();

    const callbackCtx = wrap({
      update_id: 1,
      callback_query: {
        id: 'q',
        from: { id: 42, is_bot: false, first_name: 'Bob' },
        chat_instance: 'c',
        data: 'x',
      },
    });
    expect(callbackCtx.eventOf(CallbackQuery)).toBeInstanceOf(CallbackQuery);
    expect(callbackCtx.eventOf(Message)).toBeUndefined();
  });
});

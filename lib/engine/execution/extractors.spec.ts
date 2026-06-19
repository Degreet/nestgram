import { BotService } from '../../api';
import {
  ContextFactory,
  EventFactory,
  TelegramExecutionContext,
} from '../context';
import { RawUpdate } from '../../events/raw-update.types';
import {
  extractArgs,
  extractCallbackData,
  extractChat,
  extractEditTarget,
  extractPayload,
  extractSender,
} from './extractors';

function wrap(update: RawUpdate): TelegramExecutionContext {
  const botService = { token: 'TEST' } as unknown as BotService;
  const factory = new ContextFactory(botService, new EventFactory());
  const ctx = factory.wrap(update);
  if (!ctx) {
    throw new Error('expected a resolvable update');
  }
  return ctx;
}

function messageUpdate(text: string): RawUpdate {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: 1,
      chat: { id: 99, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'Alice' },
      text,
    },
  };
}

describe('extractors', () => {
  describe('extractSender', () => {
    it('returns the message sender', () => {
      expect(extractSender(wrap(messageUpdate('/start')))?.id).toBe(7);
    });

    it('returns the callback-query sender', () => {
      const ctx = wrap({
        update_id: 1,
        callback_query: {
          id: 'q',
          from: { id: 42, is_bot: false, first_name: 'Bob' },
          chat_instance: 'c',
          data: 'data',
        },
      });
      expect(extractSender(ctx)?.id).toBe(42);
    });
  });

  describe('extractChat', () => {
    it('returns the chat of a message', () => {
      expect(extractChat(wrap(messageUpdate('hi')))?.id).toBe(99);
    });
  });

  describe('extractArgs', () => {
    it('splits the arguments after a command', () => {
      expect(extractArgs(wrap(messageUpdate('/start a b c')))).toEqual([
        'a',
        'b',
        'c',
      ]);
    });

    it('returns an empty array when there are no arguments', () => {
      expect(extractArgs(wrap(messageUpdate('/start')))).toEqual([]);
    });
  });

  describe('extractPayload', () => {
    it('returns the raw remainder after a command', () => {
      expect(extractPayload(wrap(messageUpdate('/start ref_123')))).toBe(
        'ref_123',
      );
    });

    it('returns undefined when there is no remainder', () => {
      expect(extractPayload(wrap(messageUpdate('/start')))).toBeUndefined();
    });
  });

  describe('extractCallbackData', () => {
    it('returns the callback_query data', () => {
      const ctx = wrap({
        update_id: 1,
        callback_query: {
          id: 'q',
          from: { id: 1, is_bot: false, first_name: 'A' },
          chat_instance: 'c',
          data: 'open_menu',
        },
      });
      expect(extractCallbackData(ctx)).toBe('open_menu');
    });
  });

  describe('extractEditTarget', () => {
    it('targets the message a callback is attached to', () => {
      const ctx = wrap({
        update_id: 1,
        callback_query: {
          id: 'q',
          from: { id: 1, is_bot: false, first_name: 'A' },
          chat_instance: 'c',
          data: 'toggle',
          message: {
            message_id: 555,
            date: 1,
            chat: { id: 99, type: 'private' },
          },
        },
      });
      expect(extractEditTarget(ctx)).toEqual({ chat_id: 99, message_id: 555 });
    });

    it('is undefined outside a callback context (nothing of the bot to edit)', () => {
      expect(extractEditTarget(wrap(messageUpdate('hi')))).toBeUndefined();
    });

    it('is undefined for an inaccessible message (date 0 — too old/deleted)', () => {
      const ctx = wrap({
        update_id: 1,
        callback_query: {
          id: 'q',
          from: { id: 1, is_bot: false, first_name: 'A' },
          chat_instance: 'c',
          data: 'toggle',
          message: {
            message_id: 555,
            date: 0,
            chat: { id: 99, type: 'private' },
          },
        },
      });
      expect(extractEditTarget(ctx)).toBeUndefined();
    });

    it('is undefined for an inline-only callback (no message)', () => {
      const ctx = wrap({
        update_id: 1,
        callback_query: {
          id: 'q',
          from: { id: 1, is_bot: false, first_name: 'A' },
          chat_instance: 'c',
          data: 'toggle',
          inline_message_id: 'inline-1',
        },
      });
      expect(extractEditTarget(ctx)).toBeUndefined();
    });
  });
});

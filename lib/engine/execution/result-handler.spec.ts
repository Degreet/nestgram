import { Logger } from '@nestjs/common';

import { ResultHandler } from './result-handler';
import { TelegramExecutionContext } from '../context';
import { BotService } from '../../api';
import {
  ApiMethod,
  EditMessageMedia,
  EditMessageReplyMarkup,
  EditMessageText,
  GetMe,
} from '../../api/methods';
import { InlineKeyboard } from '../../keyboards';
import { ApiException } from '../../exceptions';

// The handler reads the per-update bot off the context (ctx.bot), so the mock
// bot is carried by the context, not injected into the handler.
function ctxWith(event: unknown, bot: BotService): TelegramExecutionContext {
  return { kind: 'message', event, bot } as unknown as TelegramExecutionContext;
}

// A callback context whose attached message is the bot's own, editable one.
function callbackCtx(bot: BotService): TelegramExecutionContext {
  return {
    kind: 'callback_query',
    update: {
      callback_query: {
        message: { message_id: 555, chat: { id: 99, type: 'private' } },
      },
    },
    bot,
  } as unknown as TelegramExecutionContext;
}

describe('ResultHandler', () => {
  let called: ApiMethod<unknown, unknown>[];
  let streamed: { chatId: number; source: unknown }[];
  let handler: ResultHandler;
  let bot: BotService;

  beforeEach(() => {
    called = [];
    streamed = [];
    bot = {
      call: (method: ApiMethod<unknown, unknown>) => {
        called.push(method);
        return Promise.resolve();
      },
      streamMessage: (chatId: number, source: unknown) => {
        streamed.push({ chatId, source });
        return Promise.resolve(undefined);
      },
    } as unknown as BotService;
    handler = new ResultHandler();
  });

  it('sends a returned string via the event', async () => {
    const answered: string[] = [];
    const event = { answer: (text: string) => answered.push(text) };

    await handler.handle('hello', ctxWith(event, bot));

    expect(answered).toEqual(['hello']);
  });

  it("executes a returned command object via the context's bot", async () => {
    const command = new GetMe();

    await handler.handle(command, ctxWith({}, bot));

    expect(called).toEqual([command]);
  });

  it('does nothing for void / undefined', async () => {
    const event = {
      answer: () => {
        throw new Error('should not be called');
      },
    };
    await expect(
      handler.handle(undefined, ctxWith(event, bot)),
    ).resolves.toBeUndefined();
    expect(called).toEqual([]);
  });

  it('ignores a non-string, non-command value (e.g. an already-sent result)', async () => {
    // `return message.answer(...)` resolves to a plain object — a silent noop.
    await expect(
      handler.handle({ message_id: 7 }, ctxWith({}, bot)),
    ).resolves.toBeUndefined();
    expect(called).toEqual([]);
  });

  describe('edit-in-place', () => {
    it('edits the callback message markup when a bare keyboard is returned', async () => {
      const keyboard = new InlineKeyboard().text('Done', 'done');

      await handler.handle(keyboard, callbackCtx(bot));

      expect(called).toHaveLength(1);
      const command = called[0] as EditMessageReplyMarkup;
      expect(command).toBeInstanceOf(EditMessageReplyMarkup);
      expect(command.payload).toMatchObject({
        chat_id: 99,
        message_id: 555,
        reply_markup: keyboard,
      });
    });

    it('warns and does nothing when a keyboard is returned outside a callback', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await handler.handle(
        new InlineKeyboard().text('x', 'x'),
        ctxWith({}, bot),
      );

      expect(called).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('no message to edit in place'),
      );
      warn.mockRestore();
    });

    it('fills chat_id/message_id on an untargeted edit command from the callback', async () => {
      await handler.handle(
        new EditMessageText({ text: 'updated' }),
        callbackCtx(bot),
      );

      expect(called).toHaveLength(1);
      const command = called[0] as EditMessageText;
      expect(command).toBeInstanceOf(EditMessageText);
      expect(command.payload).toMatchObject({
        chat_id: 99,
        message_id: 555,
        text: 'updated',
      });
    });

    it('fills chat_id/message_id on an untargeted editMessageMedia from the callback', async () => {
      await handler.handle(
        new EditMessageMedia({ media: { type: 'photo', media: 'file_id' } }),
        callbackCtx(bot),
      );

      expect(called).toHaveLength(1);
      const command = called[0] as EditMessageMedia;
      expect(command).toBeInstanceOf(EditMessageMedia);
      expect(command.payload).toMatchObject({
        chat_id: 99,
        message_id: 555,
        media: { type: 'photo', media: 'file_id' },
      });
    });

    it('leaves an explicitly-targeted edit command untouched', async () => {
      const command = new EditMessageText({
        chat_id: 5,
        message_id: 9,
        text: 'x',
      });

      await handler.handle(command, callbackCtx(bot));

      // Passed straight through — same instance, no retargeting.
      expect(called).toEqual([command]);
    });

    it('warns instead of throwing when the target message is not editable', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      bot = {
        call: () =>
          Promise.reject(
            new ApiException(
              {
                ok: false,
                error_code: 400,
                description: "message can't be edited",
              },
              {},
            ),
          ),
      } as unknown as BotService;

      await expect(
        handler.handle(new InlineKeyboard().text('x', 'x'), callbackCtx(bot)),
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not edit the message in place'),
      );
      warn.mockRestore();
    });

    it('rethrows a non-editability error from an auto-edit', async () => {
      bot = {
        call: () => Promise.reject(new Error('network down')),
      } as unknown as BotService;

      await expect(
        handler.handle(new InlineKeyboard().text('x', 'x'), callbackCtx(bot)),
      ).rejects.toThrow('network down');
    });
  });

  describe('streaming (returned async-iterable)', () => {
    async function* gen(): AsyncGenerator<string> {
      yield 'hi';
    }

    function chatCtx(
      chat: { id: number; type: string } | undefined,
    ): TelegramExecutionContext {
      return {
        kind: 'message',
        event: {},
        bot,
        chat,
        update: {},
      } as unknown as TelegramExecutionContext;
    }

    it('streams a returned async-iterable to a private chat', async () => {
      const source = gen();

      await handler.handle(source, chatCtx({ id: 7, type: 'private' }));

      expect(streamed).toEqual([{ chatId: 7, source }]);
    });

    it('warns and drops a stream returned in a non-private chat', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await handler.handle(gen(), chatCtx({ id: -100, type: 'supergroup' }));

      expect(streamed).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('private chat'),
      );
      warn.mockRestore();
    });

    it('warns and drops a stream when the update has no chat', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await handler.handle(gen(), chatCtx(undefined));

      expect(streamed).toEqual([]);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it('warns and drops a stream returned for a guest message', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      // A guest message's chat looks private, so the guest guard must fire first.
      await handler.handle(gen(), {
        kind: 'guest_message',
        event: {},
        bot,
        chat: { id: 7, type: 'private' },
        update: { guest_message: { guest_query_id: 'gq_1' } },
      } as unknown as TelegramExecutionContext);

      expect(streamed).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('guest'));
      warn.mockRestore();
    });
  });
});

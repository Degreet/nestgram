import { ResultHandler } from './result-handler';
import { TelegramExecutionContext } from '../context';
import { BotService } from '../../api';
import { ApiMethod, GetMe } from '../../api/methods';

// The handler reads the per-update bot off the context (ctx.bot), so the mock
// bot is carried by the context, not injected into the handler.
function ctxWith(event: unknown, bot: BotService): TelegramExecutionContext {
  return { kind: 'message', event, bot } as unknown as TelegramExecutionContext;
}

describe('ResultHandler', () => {
  let called: ApiMethod<unknown, unknown>[];
  let handler: ResultHandler;
  let bot: BotService;

  beforeEach(() => {
    called = [];
    bot = {
      call: (method: ApiMethod<unknown, unknown>) => {
        called.push(method);
        return Promise.resolve();
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
});

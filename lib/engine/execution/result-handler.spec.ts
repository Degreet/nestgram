import { ResultHandler } from './result-handler';
import { TelegramExecutionContext } from '../context';
import { BotService } from '../../api';
import { ApiMethod, GetMe } from '../../api/methods';

function ctxWith(event: unknown): TelegramExecutionContext {
  return { kind: 'message', event } as unknown as TelegramExecutionContext;
}

describe('ResultHandler', () => {
  let called: ApiMethod<unknown, unknown>[];
  let handler: ResultHandler;

  beforeEach(() => {
    called = [];
    const bot = {
      call: (method: ApiMethod<unknown, unknown>) => {
        called.push(method);
        return Promise.resolve();
      },
    } as unknown as BotService;
    handler = new ResultHandler(bot);
  });

  it('sends a returned string via the event', async () => {
    const answered: string[] = [];
    const event = { answer: (text: string) => answered.push(text) };

    await handler.handle('hello', ctxWith(event));

    expect(answered).toEqual(['hello']);
  });

  it('executes a returned command object via bot.call', async () => {
    const command = new GetMe();

    await handler.handle(command, ctxWith({}));

    expect(called).toEqual([command]);
  });

  it('does nothing for void / undefined', async () => {
    const event = {
      answer: () => {
        throw new Error('should not be called');
      },
    };
    await expect(
      handler.handle(undefined, ctxWith(event)),
    ).resolves.toBeUndefined();
    expect(called).toEqual([]);
  });

  it('ignores a non-string, non-command value (e.g. an already-sent result)', async () => {
    // `return message.answer(...)` resolves to a plain object — a silent noop.
    await expect(
      handler.handle({ message_id: 7 }, ctxWith({})),
    ).resolves.toBeUndefined();
    expect(called).toEqual([]);
  });
});

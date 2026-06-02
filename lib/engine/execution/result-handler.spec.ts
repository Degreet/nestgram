import { ResultHandler } from './result-handler';
import { TelegramExecutionContext } from '../context';

function ctxWith(event: unknown): TelegramExecutionContext {
  return { kind: 'message', event } as unknown as TelegramExecutionContext;
}

describe('ResultHandler', () => {
  const handler = new ResultHandler();

  it('sends a returned string via the event', async () => {
    const answered: string[] = [];
    const event = { answer: (text: string) => answered.push(text) };

    await handler.handle('hello', ctxWith(event));

    expect(answered).toEqual(['hello']);
  });

  it('executes a returned command object', async () => {
    let fetched = false;
    const command = {
      fetch: () => {
        fetched = true;
        return Promise.resolve();
      },
    };

    await handler.handle(command, ctxWith({}));

    expect(fetched).toBe(true);
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
  });

  it('ignores a non-string, non-command value (e.g. an already-sent result)', async () => {
    // `return message.answer(...)` resolves to a plain object — a silent noop.
    await expect(
      handler.handle({ message_id: 7 }, ctxWith({})),
    ).resolves.toBeUndefined();
  });
});

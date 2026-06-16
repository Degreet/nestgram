import { ArgumentsHost } from '@nestjs/common';

import { ReplyExceptionFilter } from './reply-exception.filter';
import { ResultHandler } from '../../engine/execution';
import { UpdateKind } from '../../engine/context';
import { AnswerException, ReplyException } from '../../exceptions';
import { SendMessage } from '../../api/methods';
import type { NestgramModuleOptions } from '../../module/nestgram-module.types';

const REPLY_TEXT = 'Only admins.';
const ALERT_TEXT = 'Too fast.';

/** A fake event that records its `answer(text, options)` calls. */
class FakeEvent {
  readonly answered: Array<{ text?: string; options?: unknown }> = [];
  answer(text?: string, options?: unknown): Promise<void> {
    this.answered.push({ text, options });
    return Promise.resolve();
  }
}

/** A fake context with no `answer` (e.g. a poll) — used for the warn path. */
class AnswerlessContext {
  readonly kind = UpdateKind.Message;
  readonly event = {};
}

interface FakeCtx {
  kind: UpdateKind;
  event: FakeEvent;
}

function host(ctx: unknown): ArgumentsHost {
  return {
    getArgByIndex: (index: number) => (index === 1 ? ctx : undefined),
  } as ArgumentsHost;
}

function makeCtx(kind: UpdateKind): FakeCtx {
  return { kind, event: new FakeEvent() };
}

function filterWith(options: NestgramModuleOptions): {
  filter: ReplyExceptionFilter;
  resultHandler: jest.Mocked<ResultHandler>;
} {
  const resultHandler = {
    handle: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ResultHandler>;
  return {
    filter: new ReplyExceptionFilter(resultHandler, options),
    resultHandler,
  };
}

describe('ReplyExceptionFilter', () => {
  it('delegates a bare-string ReplyException to ResultHandler (DRY with handler returns)', async () => {
    const { filter, resultHandler } = filterWith({});
    const ctx = makeCtx(UpdateKind.Message);

    await filter.catch(new ReplyException(REPLY_TEXT), host(ctx));

    expect(resultHandler.handle).toHaveBeenCalledWith(
      REPLY_TEXT,
      ctx,
      undefined,
    );
    expect(ctx.event.answered).toHaveLength(0);
  });

  it('delegates a command-object ReplyException to ResultHandler', async () => {
    const { filter, resultHandler } = filterWith({});
    const ctx = makeCtx(UpdateKind.Message);
    const command = new SendMessage({ chat_id: 1, text: REPLY_TEXT });

    await filter.catch(new ReplyException(command), host(ctx));

    expect(resultHandler.handle).toHaveBeenCalledWith(command, ctx, undefined);
  });

  it('delegates a string + options ReplyException to ResultHandler with the options', async () => {
    const { filter, resultHandler } = filterWith({});
    const ctx = makeCtx(UpdateKind.Message);
    const replyMarkup = { force_reply: true } as const;

    await filter.catch(
      new ReplyException(REPLY_TEXT, { reply_markup: replyMarkup }),
      host(ctx),
    );

    expect(resultHandler.handle).toHaveBeenCalledWith(REPLY_TEXT, ctx, {
      reply_markup: replyMarkup,
    });
  });

  it('answers the callback query for AnswerException on a callback update', async () => {
    const { filter, resultHandler } = filterWith({});
    const ctx = makeCtx(UpdateKind.CallbackQuery);

    await filter.catch(
      new AnswerException(ALERT_TEXT, { show_alert: true }),
      host(ctx),
    );

    expect(resultHandler.handle).not.toHaveBeenCalled();
    expect(ctx.event.answered).toEqual([
      { text: ALERT_TEXT, options: { show_alert: true } },
    ]);
  });

  it('ignores AnswerException on a non-callback update (callback-only)', async () => {
    const { filter, resultHandler } = filterWith({});
    const ctx = makeCtx(UpdateKind.Message);

    await filter.catch(new AnswerException(ALERT_TEXT), host(ctx));

    expect(resultHandler.handle).not.toHaveBeenCalled();
    expect(ctx.event.answered).toHaveLength(0);
  });

  it('does not throw on a context whose event cannot answer (delegated to ResultHandler)', async () => {
    const { filter, resultHandler } = filterWith({});

    // The "no answer()" warning lives in ResultHandler now; the filter just
    // delegates and must not surface an error.
    await expect(
      filter.catch(
        new ReplyException(REPLY_TEXT, { reply_markup: { force_reply: true } }),
        host(new AnswerlessContext()),
      ),
    ).resolves.toBeUndefined();
    expect(resultHandler.handle).toHaveBeenCalled();
  });

  it('re-throws when replyExceptions is false (self-disabled)', async () => {
    const { filter, resultHandler } = filterWith({ replyExceptions: false });
    const exception = new ReplyException(REPLY_TEXT);

    await expect(
      filter.catch(exception, host(makeCtx(UpdateKind.Message))),
    ).rejects.toBe(exception);
    expect(resultHandler.handle).not.toHaveBeenCalled();
  });

  it('swallows a send failure instead of re-throwing the control-flow exception', async () => {
    const { filter, resultHandler } = filterWith({});
    resultHandler.handle.mockRejectedValueOnce(new Error('send failed'));

    await expect(
      filter.catch(
        new ReplyException(REPLY_TEXT),
        host(makeCtx(UpdateKind.Message)),
      ),
    ).resolves.toBeUndefined();
  });
});

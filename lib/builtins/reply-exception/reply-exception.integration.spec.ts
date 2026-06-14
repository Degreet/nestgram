/**
 * Exercises the `exception -> reaction` feature end to end through the REAL
 * pipeline ({@link NestgramTestbed}): a thrown {@link ReplyException} from a
 * handler or a guard is mapped to a Telegram reply by the built-in
 * {@link ReplyExceptionFilter}, which sits in the same ECC pipeline as the
 * handler. Also proves the `replyExceptions: false` opt-out and that a plain
 * error is unaffected.
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UseGuards,
} from '@nestjs/common';

import { Action } from '../../decorators/listeners/action.decorator';
import { Command } from '../../decorators/listeners/command.decorator';
import { Router } from '../../decorators/injectable/router.decorator';
import { CallbackQuery } from '../../events/callback-query';
import { SendMessage } from '../../api/methods';
import { AnswerException, ReplyException } from '../../exceptions';
import { NestgramTestbed } from '../../testing/nestgram-testbed';
import { updates } from '../../testing/update-factory';

const ADMINS_ONLY = 'Only admins can do that.';
const VALIDATION_REPLY = 'Name is required.';
const TOO_FAST = 'Too fast — slow down.';
const COMMAND_TEXT = 'Done via command.';
const CHAT_ID = 99;

@Injectable()
class AdminGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new ReplyException(ADMINS_ONLY);
  }
}

@Router()
class ExceptionRouter {
  @UseGuards(AdminGuard)
  @Command('admin')
  admin(): string {
    return 'you should never see this';
  }

  @Command('validate')
  validate(): void {
    throw new ReplyException(VALIDATION_REPLY);
  }

  @Command('saved')
  saved(): void {
    throw new ReplyException(COMMAND_TEXT, {
      reply_markup: { force_reply: true },
    });
  }

  @Command('command')
  command(): void {
    throw new ReplyException(
      new SendMessage({ chat_id: CHAT_ID, text: COMMAND_TEXT }),
    );
  }

  @Command('boom')
  boom(): void {
    throw new Error('plain error');
  }

  @Action('rate')
  rate(_query: CallbackQuery): void {
    throw new AnswerException(TOO_FAST, { show_alert: true });
  }
}

describe('ReplyException -> reaction (integration)', () => {
  let bot: NestgramTestbed;

  afterEach(async () => {
    await bot?.close();
  });

  it('replies when a HANDLER throws ReplyException(string)', async () => {
    bot = await NestgramTestbed.create({ routers: [ExceptionRouter] });
    await bot.dispatch(updates.command('validate'));

    expect(bot.lastMessage?.text).toBe(VALIDATION_REPLY);
    expect(bot.lastError).toBeUndefined();
  });

  it('replies when a GUARD throws and suppresses the handler', async () => {
    bot = await NestgramTestbed.create({ routers: [ExceptionRouter] });
    await bot.dispatch(updates.command('admin'));

    // The guard short-circuits before the handler: the only reply is the guard's
    // ReplyException, never the handler's own return string.
    expect(bot.calls(SendMessage)).toHaveLength(1);
    expect(bot.lastMessage?.text).toBe(ADMINS_ONLY);
    expect(bot.lastError).toBeUndefined();
  });

  it('applies reply options on a string + options ReplyException', async () => {
    bot = await NestgramTestbed.create({ routers: [ExceptionRouter] });
    await bot.dispatch(updates.command('saved'));

    expect(bot.lastMessage?.text).toBe(COMMAND_TEXT);
    expect(bot.lastMessage?.reply_markup).toEqual({ force_reply: true });
  });

  it('sends a command-object ReplyException through the bot', async () => {
    bot = await NestgramTestbed.create({ routers: [ExceptionRouter] });
    await bot.dispatch(updates.command('command'));

    const sent = bot.calls(SendMessage).at(-1);
    expect(sent?.payload.chat_id).toBe(CHAT_ID);
    expect(sent?.payload.text).toBe(COMMAND_TEXT);
  });

  it('answers the callback query on AnswerException', async () => {
    bot = await NestgramTestbed.create({ routers: [ExceptionRouter] });
    await bot.dispatch(updates.callbackQuery('rate'));

    const answer = bot.calls('answerCallbackQuery').at(-1);
    expect(answer?.payload.text).toBe(TOO_FAST);
    expect(answer?.payload.show_alert).toBe(true);
    expect(bot.lastError).toBeUndefined();
  });

  it('does not reply when replyExceptions is false (exception propagates)', async () => {
    // The disabled filter re-throws, so the exception flows past it to the
    // dispatcher's normal logging path — no reply is sent. (It bypasses the
    // testbed's catch-all CaptureErrorFilter because Nest invokes only the first
    // matching filter, our @Catch(ReplyException), so `lastError` is not the
    // observable here — the absence of any reply is.)
    bot = await NestgramTestbed.create({
      routers: [ExceptionRouter],
      replyExceptions: false,
    });
    await bot.dispatch(updates.command('validate'));

    expect(bot.lastMessage).toBeUndefined();
    expect(bot.calls(SendMessage)).toHaveLength(0);
  });

  it('leaves a non-ReplyException error untouched (still propagates)', async () => {
    bot = await NestgramTestbed.create({ routers: [ExceptionRouter] });
    await bot.dispatch(updates.command('boom'));

    expect(bot.lastError).toBeInstanceOf(Error);
    expect((bot.lastError as Error).message).toBe('plain error');
    expect(bot.lastMessage).toBeUndefined();
  });
});

/**
 * Dogfoods the testing harness: a sample bot tested entirely through
 * {@link NestgramTestbed}, exercising the REAL engine (discovery, matching, the
 * Nest pipeline via ECC) with no Telegram connection. Also asserts the harness
 * never touches the network.
 */
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UseGuards,
} from '@nestjs/common';
import type { Observable } from 'rxjs';

import { Action } from '../decorators/listeners/action.decorator';
import { Command } from '../decorators/listeners/command.decorator';
import { OnMessage } from '../decorators/listeners/on-message.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { CallbackData } from '../decorators/params/callback-data.decorator';
import { CallbackQuery } from '../events/callback-query';
import { Message } from '../events/message';
import { SendMessage } from '../api/methods';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from '../api/request';
import { ParseMode } from '../api/parse-mode';
import { NestgramTestbed } from './nestgram-testbed';
import { updates, UpdateFactory } from './update-factory';

@Injectable()
class DenyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}

@Router()
class SampleRouter {
  @Command('start')
  start(message: Message): string {
    return `Hi ${message.from?.first_name}`;
  }

  @Action('menu:open')
  async openMenu(
    query: CallbackQuery,
    @CallbackData() data?: string,
  ): Promise<void> {
    // A real handler edits/answers the attached message; the fake callback
    // update carries one, so `message` is present.
    const message = query.message;
    if (message) {
      await message.answer(`menu opened via ${data}`);
    }
  }

  @UseGuards(DenyGuard)
  @Command('secret')
  secret(): string {
    return 'you should never see this';
  }

  @Command('boom')
  boom(): string {
    throw new Error('handler exploded');
  }

  @OnMessage()
  echo(message: Message): Promise<unknown> {
    return message.answer(`echo: ${message.text}`);
  }
}

@Injectable()
class TagInterceptor implements ApiInterceptor {
  intercept<T>(
    context: ApiExecutionContext,
    next: ApiCallHandler<T>,
  ): Observable<T> {
    const request = context.getRequest();
    if (typeof request.payload.text === 'string') {
      request.payload.text = `[tagged] ${request.payload.text}`;
    }
    return next.handle();
  }
}

describe('NestgramTestbed', () => {
  let bot: NestgramTestbed;

  beforeEach(async () => {
    bot = await NestgramTestbed.create({ routers: [SampleRouter] });
  });

  afterEach(async () => {
    await bot.close();
  });

  it('matches a command and captures the reply (return string)', async () => {
    await bot.dispatch(updates.command('start'));

    expect(bot.sent).toHaveLength(1);
    expect(bot.sent[0]).toMatchObject({
      method: 'sendMessage',
      payload: { text: 'Hi Test' },
    });
    expect(bot.lastMessage?.text).toBe('Hi Test');
  });

  it('matches a callback query and captures message.answer()', async () => {
    await bot.dispatch(updates.callbackQuery('menu:open'));

    expect(bot.lastMessage?.text).toBe('menu opened via menu:open');
  });

  it('a denying guard blocks the handler — nothing is sent', async () => {
    // Control: a matching command DOES run (proved above), so an empty capture
    // here is the guard, not a routing failure.
    await bot.dispatch(updates.command('secret'));

    expect(bot.sent).toHaveLength(0);
  });

  it('routes plain text to @OnMessage, not a command', async () => {
    await bot.dispatch(updates.message('just text'));

    expect(bot.lastMessage?.text).toBe('echo: just text');
  });

  it('runs multiple updates in order, accumulating captures', async () => {
    await bot.dispatch(updates.command('start'));
    await bot.dispatch(updates.message('again'));

    expect(bot.sent.map((call) => call.payload.text)).toEqual([
      'Hi Test',
      'echo: again',
    ]);
  });

  it('reset() clears captured calls', async () => {
    await bot.dispatch(updates.command('start'));
    bot.reset();

    expect(bot.sent).toHaveLength(0);
  });

  it('overrides the sender via update overrides', async () => {
    await bot.dispatch(
      updates.command('start', undefined, { from: { first_name: 'Bob' } }),
    );

    expect(bot.lastMessage?.text).toBe('Hi Bob');
  });
});

describe('NestgramTestbed — pipeline + stubs', () => {
  it('captures the request AFTER built-in interceptors (default parse_mode)', async () => {
    const bot = await NestgramTestbed.create({
      routers: [SampleRouter],
      parseMode: ParseMode.Html,
    });

    await bot.dispatch(updates.command('start'));

    expect(bot.lastMessage?.parse_mode).toBe('HTML');
    await bot.close();
  });

  it('runs a user apiInterceptor before capture (its mutation shows in sent)', async () => {
    const bot = await NestgramTestbed.create({
      routers: [SampleRouter],
      apiInterceptors: [TagInterceptor],
    });

    await bot.dispatch(updates.command('start'));

    expect(bot.lastMessage?.text).toBe('[tagged] Hi Test');
    await bot.close();
  });

  it('onApi() stubs the raw result a handler reads back (command class key)', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });
    bot.onApi(SendMessage, () => ({
      message_id: 999,
      date: 1,
      chat: { id: 1, type: 'private' },
      text: 'stubbed',
    }));

    // The @OnMessage handler returns message.answer(...) — its resolved value is
    // the wrapped Message built from the stub.
    await bot.dispatch(updates.message('hi'));

    expect(bot.lastCall?.method).toBe('sendMessage');
    await bot.close();
  });

  it('onApi() also accepts the bare method name (escape hatch)', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });
    bot.onApi('sendMessage', () => ({
      message_id: 7,
      date: 1,
      chat: { id: 1, type: 'private' },
      text: 'stubbed',
    }));

    await bot.dispatch(updates.message('hi'));

    expect(bot.lastCall?.method).toBe('sendMessage');
    await bot.close();
  });

  it('calls() finds every send for a method (class and string keys agree)', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });

    await bot.dispatch(updates.command('start'));
    await bot.dispatch(updates.message('again'));

    expect(bot.calls(SendMessage)).toHaveLength(2);
    expect(bot.calls('sendMessage')).toHaveLength(2);
    expect(bot.calls(SendMessage)[0].payload.text).toBe('Hi Test');
    await bot.close();
  });
});

describe('NestgramTestbed — error paths', () => {
  it('records a thrown handler error on lastError, still swallowing by default', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });

    // Default dispatch resolves (production fidelity — the dispatcher logs and
    // moves on), but the error is observable.
    await expect(
      bot.dispatch(updates.command('boom')),
    ).resolves.toBeUndefined();

    expect(bot.lastError).toBeInstanceOf(Error);
    expect((bot.lastError as Error).message).toBe('handler exploded');
    expect(bot.sent).toHaveLength(0);
    await bot.close();
  });

  it('rethrows the captured error when { rethrow: true }', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });

    await expect(
      bot.dispatch(updates.command('boom'), { rethrow: true }),
    ).rejects.toThrow('handler exploded');
    await bot.close();
  });

  it('leaves lastError undefined on a clean dispatch', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });

    await bot.dispatch(updates.command('start'));

    expect(bot.lastError).toBeUndefined();
    await bot.close();
  });

  it('surfaces a guard denial as the thrown ForbiddenException', async () => {
    // A Nest guard denies by throwing ForbiddenException; that real exception
    // flows through the same filter, so it is observable on lastError — letting a
    // test assert the guard fired, distinct from a clean no-match (undefined).
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });

    await bot.dispatch(updates.command('secret'));

    expect(bot.sent).toHaveLength(0);
    expect(bot.lastError).toBeInstanceOf(ForbiddenException);
    await bot.close();
  });

  it('leaves lastError undefined when nothing matches', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });

    await bot.dispatch(updates.callbackQuery('no:such:action'));

    expect(bot.lastError).toBeUndefined();
    await bot.close();
  });

  it('clears a prior error on the next clean dispatch', async () => {
    const bot = await NestgramTestbed.create({ routers: [SampleRouter] });

    await bot.dispatch(updates.command('boom'));
    expect(bot.lastError).toBeInstanceOf(Error);

    await bot.dispatch(updates.command('start'));
    expect(bot.lastError).toBeUndefined();
    await bot.close();
  });
});

describe('NestgramTestbed — no network', () => {
  it('never calls fetch while dispatching and sending', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = jest.fn(() => {
      throw new Error('network was touched');
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    try {
      const bot = await NestgramTestbed.create({ routers: [SampleRouter] });
      await bot.dispatch(updates.command('start'));
      await bot.dispatch(updates.message('text'));
      await bot.close();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('UpdateFactory', () => {
  it('auto-increments update_id across builders', () => {
    const factory = new UpdateFactory();
    const a = factory.message('a');
    const b = factory.callbackQuery('x');

    expect(b.update_id).toBe(a.update_id + 1);
  });

  it('builds /command text from the bare command name and args', () => {
    const factory = new UpdateFactory();
    expect(factory.command('start').message?.text).toBe('/start');
    expect(factory.command('start', 'ref_42').message?.text).toBe(
      '/start ref_42',
    );
  });

  it('fills sensible defaults a handler can read', () => {
    const factory = new UpdateFactory();
    const update = factory.message('hi');

    expect(update.message?.chat).toMatchObject({ id: 1000, type: 'private' });
    expect(update.message?.from).toMatchObject({ is_bot: false });
  });
});

/**
 * Exercises `@Param` end to end through the real engine (discovery, matching,
 * the Nest pipeline via ECC) — including a per-parameter pipe and the
 * `@Router('ns')` prefix — with no Telegram connection.
 */
import { ParseIntPipe } from '@nestjs/common';

import { Action } from '../listeners/action.decorator';
import { Router } from '../injectable/router.decorator';
import { Param } from './param.decorator';
import { CallbackQuery } from '../../events/callback-query';
import { NestgramTestbed } from '../../testing/nestgram-testbed';
import { updates } from '../../testing/update-factory';

const captured: unknown[] = [];

@Router('reminder')
class ReminderRouter {
  @Action('done/:id')
  done(_query: CallbackQuery, @Param('id', ParseIntPipe) id: number): void {
    captured.push(id);
  }

  @Action('open/:slug')
  open(_query: CallbackQuery, @Param('slug') slug: string): void {
    captured.push(slug);
  }
}

@Router()
class PlainRouter {
  @Action('toggle/:id')
  toggle(_query: CallbackQuery, @Param('id', ParseIntPipe) id: number): void {
    captured.push(id);
  }
}

describe('@Param', () => {
  let bot: NestgramTestbed;

  beforeEach(() => {
    captured.length = 0;
  });

  afterEach(async () => {
    await bot.close();
  });

  it('decodes a segment and applies the pipe under a router prefix', async () => {
    bot = await NestgramTestbed.create({ routers: [ReminderRouter] });

    await bot.dispatch(updates.callbackQuery('reminder/done/42'));

    expect(captured).toEqual([42]);
    expect(typeof captured[0]).toBe('number');
  });

  it('hands a raw string segment when no pipe is applied', async () => {
    bot = await NestgramTestbed.create({ routers: [ReminderRouter] });

    await bot.dispatch(updates.callbackQuery('reminder/open/groceries'));

    expect(captured).toEqual(['groceries']);
  });

  it('resolves the segment of the route that actually matched', async () => {
    bot = await NestgramTestbed.create({ routers: [ReminderRouter] });

    await bot.dispatch(updates.callbackQuery('reminder/done/7'));
    await bot.dispatch(updates.callbackQuery('reminder/open/x'));

    expect(captured).toEqual([7, 'x']);
  });

  it('works without a router prefix', async () => {
    bot = await NestgramTestbed.create({ routers: [PlainRouter] });

    await bot.dispatch(updates.callbackQuery('toggle/9'));

    expect(captured).toEqual([9]);
  });
});

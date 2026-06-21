/**
 * Exercises `@Matches()` end to end through the real engine (discovery, matching,
 * the Nest pipeline via ECC) — the whole `RegExpMatchArray` for positional
 * groups, named groups flowing into `@Param` with a pipe, and the two surfaces
 * sharing one `@Param` across a stacked `@Command` + regex `@Hears`.
 */
import { ParseIntPipe } from '@nestjs/common';

import { Command } from '../listeners/command.decorator';
import { Hears } from '../listeners/hears.decorator';
import { Router } from '../injectable/router.decorator';
import { Matches } from './matches.decorator';
import { Param } from './param.decorator';
import { Message } from '../../events/message';
import { NestgramTestbed } from '../../testing/nestgram-testbed';
import { updates } from '../../testing/update-factory';

const captured: unknown[] = [];

@Router()
class CaptureRouter {
  @Hears(/^add (\d+) (.+)$/)
  add(_message: Message, @Matches() match: RegExpMatchArray): void {
    captured.push([Number(match[1]), match[2]]);
  }

  @Hears(/^double (?<n>\d+)$/)
  double(_message: Message, @Param('n', ParseIntPipe) n: number): void {
    captured.push(n * 2);
  }

  @Hears('ping')
  ping(
    _message: Message,
    @Matches() match: RegExpMatchArray | undefined,
  ): void {
    captured.push(match);
  }
}

// One `@Param('amount')` serves both routes: `/add 5` (command segment) and
// `add 5` (regex named group) land the same captured value through it.
@Router()
class StackedRouter {
  @Command('add :amount')
  @Hears(/^add (?<amount>\d+)$/)
  add(_message: Message, @Param('amount', ParseIntPipe) amount: number): void {
    captured.push(amount);
  }
}

describe('@Matches', () => {
  let bot: NestgramTestbed;

  beforeEach(() => {
    captured.length = 0;
  });

  afterEach(async () => {
    await bot.close();
  });

  it('injects the whole RegExpMatchArray for positional groups', async () => {
    bot = await NestgramTestbed.create({ routers: [CaptureRouter] });

    await bot.dispatch(updates.message('add 5 milk'));

    expect(captured).toEqual([[5, 'milk']]);
  });

  it('routes a named group into @Param with a pipe', async () => {
    bot = await NestgramTestbed.create({ routers: [CaptureRouter] });

    await bot.dispatch(updates.message('double 7'));

    expect(captured).toEqual([14]);
  });

  it('is undefined when the matched route is not a regex', async () => {
    bot = await NestgramTestbed.create({ routers: [CaptureRouter] });

    await bot.dispatch(updates.message('ping'));

    expect(captured).toEqual([undefined]);
  });

  it('serves one @Param across a stacked @Command and regex @Hears', async () => {
    bot = await NestgramTestbed.create({ routers: [StackedRouter] });

    await bot.dispatch(updates.message('/add 5')); // command segment
    await bot.dispatch(updates.message('add 9')); // regex named group

    expect(captured).toEqual([5, 9]);
  });
});

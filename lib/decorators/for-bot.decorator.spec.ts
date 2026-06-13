import 'reflect-metadata';

import { ForBot } from './for-bot.decorator';
import { Metadata } from './metadata.enum';
import type { RoutePredicate } from '../engine/matching';
import type { TelegramExecutionContext } from '../engine/context';

function ctxForBot(name: string): TelegramExecutionContext {
  return { bot: { name } } as unknown as TelegramExecutionContext;
}

function predicateOn(carrier: object): RoutePredicate {
  const predicates: RoutePredicate[] =
    Reflect.getMetadata(Metadata.MATCH, carrier) ?? [];
  return predicates[0];
}

describe('ForBot', () => {
  it('on a class stores a predicate matching the current bot by name', () => {
    @ForBot('support')
    class SupportRouter {}

    const predicate = predicateOn(SupportRouter);
    expect(predicate.matches(ctxForBot('support'))).toBe(true);
    expect(predicate.matches(ctxForBot('sales'))).toBe(false);
  });

  it('on a method stores the same predicate on the method', () => {
    class MixedRouter {
      @ForBot('sales')
      handle(): void {
        // body irrelevant — only the decorator's metadata is under test
      }
    }

    const predicate = predicateOn(MixedRouter.prototype.handle);
    expect(predicate.matches(ctxForBot('sales'))).toBe(true);
    expect(predicate.matches(ctxForBot('support'))).toBe(false);
  });
});

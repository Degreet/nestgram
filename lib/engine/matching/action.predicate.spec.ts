import { TelegramExecutionContext } from '../context';
import { ActionPredicate } from './action.predicate';

function callbackCtx(data?: string): TelegramExecutionContext {
  return {
    kind: 'callback_query',
    update: { callback_query: data === undefined ? {} : { data } },
  } as unknown as TelegramExecutionContext;
}

describe('ActionPredicate', () => {
  it('matches any callback query when no data is given', () => {
    const any = new ActionPredicate();
    expect(any.matches(callbackCtx('whatever'))).toBe(true);
    expect(any.matches(callbackCtx(undefined))).toBe(true);
  });

  it('matches a string exactly', () => {
    const buy = new ActionPredicate('buy');
    expect(buy.matches(callbackCtx('buy'))).toBe(true);
    expect(buy.matches(callbackCtx('sell'))).toBe(false);
  });

  it('tests a RegExp against the data', () => {
    const buyId = new ActionPredicate(/^buy:(\d+)$/);
    expect(buyId.matches(callbackCtx('buy:42'))).toBe(true);
    expect(buyId.matches(callbackCtx('buy:x'))).toBe(false);
  });

  it('matches consistently with a global regex (no lastIndex drift)', () => {
    const buy = new ActionPredicate(/buy/g);
    expect(buy.matches(callbackCtx('buy'))).toBe(true);
    expect(buy.matches(callbackCtx('buy'))).toBe(true);
  });

  it('does not match when data is expected but absent', () => {
    expect(new ActionPredicate('buy').matches(callbackCtx(undefined))).toBe(
      false,
    );
  });

  describe('captures', () => {
    it('exposes the RegExpMatchArray of a regex pattern (for @Matches)', () => {
      const buyId = new ActionPredicate(/^buy:(\d+)$/);

      expect(buyId.extractMatch(callbackCtx('buy:42'))?.[1]).toBe('42');
    });

    it('exposes named groups to @Param via extractParams', () => {
      const buyId = new ActionPredicate(/^buy:(?<id>\d+)$/);

      expect(buyId.extractParams(callbackCtx('buy:42'))).toEqual({ id: '42' });
    });

    it('has no captures for any/string data, a non-match, or missing data', () => {
      expect(new ActionPredicate().extractMatch(callbackCtx('x'))).toBeNull();
      expect(
        new ActionPredicate('buy').extractMatch(callbackCtx('buy')),
      ).toBeNull();

      const buyId = new ActionPredicate(/^buy:(\d+)$/);
      expect(buyId.extractMatch(callbackCtx('sell'))).toBeNull();
      expect(buyId.extractMatch(callbackCtx(undefined))).toBeNull();
    });
  });
});

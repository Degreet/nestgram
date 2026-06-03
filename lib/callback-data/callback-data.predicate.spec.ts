import { callbackData } from './callback-data.factory';
import { CallbackDataPredicate } from './callback-data.predicate';
import { TelegramExecutionContext } from '../engine/context';

function ctx(data?: string): TelegramExecutionContext {
  return {
    update: { callback_query: data === undefined ? {} : { data } },
  } as unknown as TelegramExecutionContext;
}

describe('callbackData().filter() predicate', () => {
  const Buy = callbackData('buy', { productId: Number });

  it('matches its own data', () => {
    expect(Buy.filter().matches(ctx('buy:42'))).toBe(true);
  });

  it('does not match another definition', () => {
    expect(Buy.filter().matches(ctx('sell:42'))).toBe(false);
  });

  it('does not match a callback query without data', () => {
    expect(Buy.filter().matches(ctx())).toBe(false);
  });

  it('matching is side-effect-free (state untouched)', () => {
    const state = new Map();
    const context = {
      update: { callback_query: { data: 'buy:42' } },
      state,
    } as unknown as TelegramExecutionContext;

    Buy.filter().matches(context);
    expect(state.size).toBe(0);
  });

  it('parse() exposes the decoded values for @Data()', () => {
    const predicate = Buy.filter();
    if (!(predicate instanceof CallbackDataPredicate)) {
      throw new Error('expected a CallbackDataPredicate');
    }
    expect(predicate.parse('buy:42')).toEqual({ productId: 42 });
    expect(predicate.parse('sell:42')).toBeNull();
  });
});

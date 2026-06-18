import type { TelegramExecutionContext } from '../engine/context';
import { CallbackRoutePattern } from './callback-route-pattern';
import { CallbackRoutePredicate } from './callback-route.predicate';

function ctxWith(data?: string): TelegramExecutionContext {
  return {
    update: { callback_query: data === undefined ? {} : { data } },
  } as unknown as TelegramExecutionContext;
}

function predicate(template: string): CallbackRoutePredicate {
  return new CallbackRoutePredicate(CallbackRoutePattern.compile(template));
}

describe('CallbackRoutePredicate', () => {
  it('matches a callback query whose data fits the route', () => {
    const p = predicate('done/:id');
    expect(p.matches(ctxWith('done/42'))).toBe(true);
    expect(p.matches(ctxWith('done'))).toBe(false);
    expect(p.matches(ctxWith())).toBe(false);
  });

  it('exposes captured parameters via extractParams', () => {
    expect(
      predicate('done/:id').extractParams(ctxWith('done/42'), undefined),
    ).toEqual({ id: '42' });
    expect(
      predicate('done/:id').extractParams(ctxWith('open/42'), undefined),
    ).toBeNull();
  });

  it('re-applies the router prefix when extracting parameters', () => {
    // The listener metadata holds the unprefixed predicate, so @Param passes the
    // router prefix and extraction matches the namespaced wire data.
    const p = predicate('done/:id');
    expect(p.extractParams(ctxWith('reminder/done/42'), 'reminder')).toEqual({
      id: '42',
    });
    expect(p.extractParams(ctxWith('done/42'), 'reminder')).toBeNull();
  });

  it('namespaces with withPrefix', () => {
    const p = predicate('done/:id').withPrefix('reminder');
    expect(p.matches(ctxWith('reminder/done/42'))).toBe(true);
    expect(p.matches(ctxWith('done/42'))).toBe(false);
  });
});

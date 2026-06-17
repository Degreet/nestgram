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

  it('exposes captured parameters via extract', () => {
    expect(predicate('done/:id').extract('done/42')).toEqual({ id: '42' });
    expect(predicate('done/:id').extract('open/42')).toBeNull();
  });

  it('namespaces with withPrefix', () => {
    const p = predicate('done/:id').withPrefix('reminder');
    expect(p.matches(ctxWith('reminder/done/42'))).toBe(true);
    expect(p.matches(ctxWith('done/42'))).toBe(false);
    expect(p.extract('reminder/done/42')).toEqual({ id: '42' });
  });
});

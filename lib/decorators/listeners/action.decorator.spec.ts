import 'reflect-metadata';

import { Action } from './action.decorator';
import { Metadata } from '../metadata.enum';
import { ListenerOptions } from '../listener-options';
import { ActionPredicate, RoutePredicate } from '../../engine/matching';
import { CallbackRoutePredicate } from '../../callback-data';

function listenersOf(fn: unknown): ListenerOptions[] {
  return Reflect.getMetadata(Metadata.LISTENERS, fn as object) ?? [];
}

function predicateFor(data?: string | RegExp): unknown {
  class Router {
    handle(): void {
      return;
    }
  }
  Action(data)(Router.prototype, 'handle', { value: Router.prototype.handle });
  const [listener] = listenersOf(Router.prototype.handle);
  expect(listener.updateType).toBe('callback_query');
  return listener.predicates?.[0];
}

describe('@Action', () => {
  it('compiles a string into a CallbackRoutePredicate (route template)', () => {
    expect(predicateFor('done/:id')).toBeInstanceOf(CallbackRoutePredicate);
    expect(predicateFor('buy')).toBeInstanceOf(CallbackRoutePredicate);
  });

  it('uses an ActionPredicate for a regex and for no argument', () => {
    expect(predicateFor(/^buy:(\d+)$/)).toBeInstanceOf(ActionPredicate);
    expect(predicateFor(undefined)).toBeInstanceOf(ActionPredicate);
  });

  it('passes a custom RoutePredicate argument through unchanged', () => {
    const custom: RoutePredicate = { matches: () => true };

    class Router {
      handle(): void {
        return;
      }
    }
    Action(custom)(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const predicate = listenersOf(Router.prototype.handle)[0].predicates?.[0];
    expect(predicate).toBe(custom);
  });
});

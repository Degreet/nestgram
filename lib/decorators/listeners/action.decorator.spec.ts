import 'reflect-metadata';

import { Action } from './action.decorator';
import { Metadata } from '../metadata.enum';
import { ListenerOptions } from '../listener-options';
import { ActionPredicate } from '../../engine/matching';
import { callbackData, CallbackDataPredicate } from '../../callback-data';

function listenersOf(fn: unknown): ListenerOptions[] {
  return Reflect.getMetadata(Metadata.LISTENERS, fn as object) ?? [];
}

describe('@Action', () => {
  it('registers a callback_query listener with an ActionPredicate for a string', () => {
    class Router {
      handle(): void {
        return;
      }
    }
    Action('buy')(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const [listener] = listenersOf(Router.prototype.handle);
    expect(listener.updateType).toBe('callback_query');
    expect(listener.predicates?.[0]).toBeInstanceOf(ActionPredicate);
  });

  it('uses a RoutePredicate argument directly (callbackData filter)', () => {
    const Buy = callbackData('buy', { productId: Number });

    class Router {
      handle(): void {
        return;
      }
    }
    Action(Buy.filter())(Router.prototype, 'handle', {
      value: Router.prototype.handle,
    });

    const predicate = listenersOf(Router.prototype.handle)[0].predicates?.[0];
    expect(predicate).toBeInstanceOf(CallbackDataPredicate);
  });
});

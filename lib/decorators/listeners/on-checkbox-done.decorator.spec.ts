import 'reflect-metadata';

import { OnCheckboxDone } from './on-checkbox-done.decorator';
import { Metadata } from '../metadata.enum';
import { ListenerOptions } from '../listener-options';
import { CallbackRoutePredicate } from '../../callback-data';
import { TelegramExecutionContext } from '../../engine/context';

function predicateOf(id: string): CallbackRoutePredicate {
  class Router {
    save(): void {
      return;
    }
  }
  OnCheckboxDone(id)(Router.prototype, 'save', {
    value: Router.prototype.save,
  });
  const [listener] = Reflect.getMetadata(
    Metadata.LISTENERS,
    Router.prototype.save,
  ) as ListenerOptions[];
  expect(listener.updateType).toBe('callback_query');
  return listener.predicates?.[0] as CallbackRoutePredicate;
}

const ctxWithData = (data: string): TelegramExecutionContext =>
  ({
    update: { callback_query: { data } },
  } as unknown as TelegramExecutionContext);

describe('@OnCheckboxDone', () => {
  it('binds the cb.done route for its group, not another', () => {
    const predicate = predicateOf('tags');

    expect(predicate).toBeInstanceOf(CallbackRoutePredicate);
    expect(predicate.matches(ctxWithData('checkbox/tags/done'))).toBe(true);
    expect(predicate.matches(ctxWithData('checkbox/other/done'))).toBe(false);
  });
});

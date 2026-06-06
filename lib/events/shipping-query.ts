import { CallOptions, MethodOptions } from '../api';
import {
  AnswerShippingQuery,
  AnswerShippingQueryOptions,
} from '../api/methods';
import { UpdateType } from '../decorators';
import { RawShippingQuery } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface ShippingQuery extends RawShippingQuery {}

/** A shipping query for a flexible-price invoice. Answer ok, or with an error. */
@UpdateType('shipping_query')
export class ShippingQuery extends RichEvent {
  answer(ok: boolean, options: MethodOptions<AnswerShippingQueryOptions> = {}) {
    const { token, signal, ...rest } = options;
    return this.bot.call(
      new AnswerShippingQuery({ ...rest, shipping_query_id: this.id, ok }),
      { token, signal } satisfies CallOptions,
    );
  }
}

import { CallOptions, MethodOptions } from '../api';
import {
  AnswerPreCheckoutQuery,
  AnswerPreCheckoutQueryOptions,
} from '../api/methods';
import { UpdateType } from '../decorators';
import { RawPreCheckoutQuery } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface PreCheckoutQuery extends RawPreCheckoutQuery {}

/** A pre-checkout query — confirm (ok) or reject with an error before payment. */
@UpdateType('pre_checkout_query')
export class PreCheckoutQuery extends RichEvent {
  answer(
    ok: boolean,
    options: MethodOptions<AnswerPreCheckoutQueryOptions> = {},
  ) {
    const { token, signal, ...rest } = options;
    return this.bot.call(
      new AnswerPreCheckoutQuery({
        ...rest,
        pre_checkout_query_id: this.id,
        ok,
      }),
      { token, signal } satisfies CallOptions,
    );
  }
}

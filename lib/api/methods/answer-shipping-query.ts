import { ApiMethod } from './api-method';
import type { RawShippingOption } from '../../events/raw-update.types';

export interface AnswerShippingQueryOptions {
  shipping_query_id: string;
  ok: boolean;
  shipping_options?: RawShippingOption[];
  error_message?: string;
}

/**
 * If you sent an invoice requesting a shipping address and the parameter is_flexible was specified, the Bot API will send an Update with a shipping_query field to the bot. Use this method to reply to shipping queries. On success, True is returned.
 * @see https://core.telegram.org/bots/api#answershippingquery
 */
export class AnswerShippingQuery extends ApiMethod<
  AnswerShippingQueryOptions,
  true
> {
  readonly method = 'answerShippingQuery';

  constructor(payload: AnswerShippingQueryOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface AnswerPreCheckoutQueryOptions {
  pre_checkout_query_id: string;
  ok: boolean;
  error_message?: string;
}

/**
 * Once the user has confirmed their payment and shipping details, the Bot API sends the final confirmation in the form of an Update with the field pre_checkout_query. Use this method to respond to such pre-checkout queries. On success, True is returned. Note: The Bot API must receive an answer within 10 seconds after the pre-checkout query was sent.
 * @see https://core.telegram.org/bots/api#answerprecheckoutquery
 */
export class AnswerPreCheckoutQuery extends ApiMethod<
  AnswerPreCheckoutQueryOptions,
  true
> {
  readonly method = 'answerPreCheckoutQuery';

  constructor(payload: AnswerPreCheckoutQueryOptions) {
    super(payload);
  }
}

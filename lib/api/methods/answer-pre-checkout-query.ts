import { ApiMethod } from './api-method';

export interface AnswerPreCheckoutQueryOptions {
  pre_checkout_query_id: string;
  ok: boolean;
  error_message?: string;
}

export class AnswerPreCheckoutQuery extends ApiMethod<
  AnswerPreCheckoutQueryOptions,
  true
> {
  readonly method = 'answerPreCheckoutQuery';

  constructor(payload: AnswerPreCheckoutQueryOptions) {
    super(payload);
  }
}

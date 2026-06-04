import { ApiMethod } from './api-method';
import type { RawShippingOption } from '../../events/raw-update.types';

export interface AnswerShippingQueryOptions {
  shipping_query_id: string;
  ok: boolean;
  shipping_options?: RawShippingOption[];
  error_message?: string;
}

export class AnswerShippingQuery extends ApiMethod<
  AnswerShippingQueryOptions,
  true
> {
  readonly method = 'answerShippingQuery';

  constructor(payload: AnswerShippingQueryOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface AnswerCallbackQueryOptions {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

export class AnswerCallbackQuery extends ApiMethod<
  AnswerCallbackQueryOptions,
  true
> {
  readonly method = 'answerCallbackQuery';

  constructor(payload: AnswerCallbackQueryOptions) {
    super(payload);
  }
}

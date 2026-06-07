import { ApiMethod } from './api-method';

export interface AnswerCallbackQueryOptions {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

/**
 * Use this method to send answers to callback queries sent from inline keyboards. The answer will be displayed to the user as a notification at the top of the chat screen or as an alert. On success, True is returned.
 * @see https://core.telegram.org/bots/api#answercallbackquery
 */
export class AnswerCallbackQuery extends ApiMethod<
  AnswerCallbackQueryOptions,
  true
> {
  readonly method = 'answerCallbackQuery';

  constructor(payload: AnswerCallbackQueryOptions) {
    super(payload);
  }
}

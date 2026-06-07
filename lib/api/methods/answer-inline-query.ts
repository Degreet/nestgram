import { ApiMethod } from './api-method';
import type {
  RawInlineQueryResult,
  RawInlineQueryResultsButton,
} from '../../events/raw-update.types';

export interface AnswerInlineQueryOptions {
  inline_query_id: string;
  results: RawInlineQueryResult[];
  cache_time?: number;
  is_personal?: boolean;
  next_offset?: string;
  button?: RawInlineQueryResultsButton;
}

/**
 * Use this method to send answers to an inline query. On success, True is returned.
 * No more than 50 results per query are allowed.
 * @see https://core.telegram.org/bots/api#answerinlinequery
 */
export class AnswerInlineQuery extends ApiMethod<
  AnswerInlineQueryOptions,
  true
> {
  readonly method = 'answerInlineQuery';

  constructor(payload: AnswerInlineQueryOptions) {
    super(payload);
  }
}

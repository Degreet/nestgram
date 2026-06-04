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

export class AnswerInlineQuery extends ApiMethod<
  AnswerInlineQueryOptions,
  true
> {
  readonly method = 'answerInlineQuery';

  constructor(payload: AnswerInlineQueryOptions) {
    super(payload);
  }
}

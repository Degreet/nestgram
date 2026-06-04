import { ApiMethod } from './api-method';
import type {
  RawInlineQueryResult,
  RawSentWebAppMessage,
} from '../../events/raw-update.types';

export interface AnswerWebAppQueryOptions {
  web_app_query_id: string;
  result: RawInlineQueryResult;
}

export class AnswerWebAppQuery extends ApiMethod<
  AnswerWebAppQueryOptions,
  RawSentWebAppMessage
> {
  readonly method = 'answerWebAppQuery';

  constructor(payload: AnswerWebAppQueryOptions) {
    super(payload);
  }
}

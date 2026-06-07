import { ApiMethod } from './api-method';
import type {
  RawInlineQueryResult,
  RawSentWebAppMessage,
} from '../../events/raw-update.types';

export interface AnswerWebAppQueryOptions {
  web_app_query_id: string;
  result: RawInlineQueryResult;
}

/**
 * Use this method to set the result of an interaction with a Web App and send a corresponding message on behalf of the user to the chat from which the query originated. On success, a SentWebAppMessage object is returned.
 * @see https://core.telegram.org/bots/api#answerwebappquery
 */
export class AnswerWebAppQuery extends ApiMethod<
  AnswerWebAppQueryOptions,
  RawSentWebAppMessage
> {
  readonly method = 'answerWebAppQuery';

  constructor(payload: AnswerWebAppQueryOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface AnswerChatJoinRequestQueryOptions {
  chat_join_request_query_id: string;
  result: 'approve' | 'decline' | 'queue';
}

/**
 * Use this method to process a received chat join request query. Returns True on success.
 * @see https://core.telegram.org/bots/api#answerchatjoinrequestquery
 */
export class AnswerChatJoinRequestQuery extends ApiMethod<
  AnswerChatJoinRequestQueryOptions,
  true
> {
  readonly method = 'answerChatJoinRequestQuery';

  constructor(payload: AnswerChatJoinRequestQueryOptions) {
    super(payload);
  }
}

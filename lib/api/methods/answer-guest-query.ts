import { ApiMethod } from './api-method';
import type {
  RawInlineQueryResult,
  RawSentGuestMessage,
} from '../../events/raw-update.types';

export interface AnswerGuestQueryOptions {
  guest_query_id: string;
  result: RawInlineQueryResult;
}

/**
 * Use this method to reply to a received guest message. On success, a SentGuestMessage object is returned.
 * @see https://core.telegram.org/bots/api#answerguestquery
 */
export class AnswerGuestQuery extends ApiMethod<
  AnswerGuestQueryOptions,
  RawSentGuestMessage
> {
  readonly method = 'answerGuestQuery';

  constructor(payload: AnswerGuestQueryOptions) {
    super(payload);
  }
}

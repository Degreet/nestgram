import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
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

  readonly isAttachMedia = true;

  constructor(payload: AnswerGuestQueryOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

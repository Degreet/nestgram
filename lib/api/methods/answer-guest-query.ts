import { ApiMethod } from './api-method';
import type {
  RawInlineQueryResult,
  RawSentGuestMessage,
} from '../../events/raw-update.types';

export interface AnswerGuestQueryOptions {
  guest_query_id: string;
  result: RawInlineQueryResult;
}

export class AnswerGuestQuery extends ApiMethod<
  AnswerGuestQueryOptions,
  RawSentGuestMessage
> {
  readonly method = 'answerGuestQuery';

  constructor(payload: AnswerGuestQueryOptions) {
    super(payload);
  }
}

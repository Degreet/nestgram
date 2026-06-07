import { ApiMethod } from './api-method';
import type { RawMessageEntity } from '../../events/raw-update.types';

export interface SendMessageDraftOptions {
  chat_id: number;
  message_thread_id?: number;
  draft_id: number;
  text?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  entities?: RawMessageEntity[];
}

/**
 * Use this method to stream a partial message to a user while the message is being generated. Note that the streamed draft is ephemeral and acts as a temporary 30-second preview - once the output is finalized, you must call sendMessage with the complete message to persist it in the user's chat. Returns True on success.
 * @see https://core.telegram.org/bots/api#sendmessagedraft
 */
export class SendMessageDraft extends ApiMethod<SendMessageDraftOptions, true> {
  readonly method = 'sendMessageDraft';

  constructor(payload: SendMessageDraftOptions) {
    super(payload);
  }
}

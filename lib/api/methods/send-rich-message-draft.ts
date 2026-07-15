import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputRichMessage } from '../../events/raw-update.types';

export interface SendRichMessageDraftOptions {
  chat_id: number;
  message_thread_id?: number;
  draft_id: number;
  rich_message: RawInputRichMessage;
}

/**
 * Use this method to stream a partial rich message to a user while the message is being generated. Note that the streamed draft is ephemeral and acts as a temporary 30-second preview - once the output is finalized, you must call sendRichMessage with the complete message to persist it in the user's chat. Returns True on success.
 * @see https://core.telegram.org/bots/api#sendrichmessagedraft
 */
export class SendRichMessageDraft extends ApiMethod<
  SendRichMessageDraftOptions,
  true
> {
  readonly method = 'sendRichMessageDraft';

  readonly isAttachMedia = true;

  constructor(payload: SendRichMessageDraftOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

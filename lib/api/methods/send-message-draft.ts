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

export class SendMessageDraft extends ApiMethod<SendMessageDraftOptions, true> {
  readonly method = 'sendMessageDraft';

  constructor(payload: SendMessageDraftOptions) {
    super(payload);
  }
}

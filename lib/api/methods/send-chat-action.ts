import { ApiMethod } from './api-method';

export interface SendChatActionOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  action:
    | 'typing'
    | 'upload_photo'
    | 'record_video'
    | 'upload_video'
    | 'record_voice'
    | 'upload_voice'
    | 'upload_document'
    | 'choose_sticker'
    | 'find_location'
    | 'record_video_note'
    | 'upload_video_note';
}

export class SendChatAction extends ApiMethod<SendChatActionOptions, true> {
  readonly method = 'sendChatAction';

  constructor(payload: SendChatActionOptions) {
    super(payload);
  }
}

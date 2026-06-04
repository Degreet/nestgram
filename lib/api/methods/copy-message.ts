import { ApiMethod } from './api-method';

export interface CopyMessageOptions {
  chat_id: number | string;
  from_chat_id: number | string;
  message_id: number;
  message_thread_id?: number;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_parameters?: any;
  reply_markup?: any;
}

/** The id of a copied message — `copyMessage` returns only the new message_id. */
export interface MessageId {
  message_id: number;
}

/** Copies a message to another chat (no forward header). Returns the new id. */
export class CopyMessage extends ApiMethod<CopyMessageOptions, MessageId> {
  readonly method = 'copyMessage';

  constructor(payload: CopyMessageOptions) {
    super(payload);
  }
}

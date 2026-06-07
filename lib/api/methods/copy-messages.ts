import { ApiMethod } from './api-method';
import type { RawMessageId } from '../../events/raw-update.types';

export interface CopyMessagesOptions {
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  from_chat_id: number | string;
  message_ids: number[];
  disable_notification?: boolean;
  protect_content?: boolean;
  remove_caption?: boolean;
}

export class CopyMessages extends ApiMethod<
  CopyMessagesOptions,
  RawMessageId[]
> {
  readonly method = 'copyMessages';

  constructor(payload: CopyMessagesOptions) {
    super(payload);
  }
}

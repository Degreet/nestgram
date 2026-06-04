import { ApiMethod } from './api-method';
import type { RawMessageId } from '../../events/raw-update.types';

export interface ForwardMessagesOptions {
  chat_id: number | string;
  message_thread_id?: number;
  from_chat_id: number | string;
  message_ids: number[];
  disable_notification?: boolean;
  protect_content?: boolean;
}

export class ForwardMessages extends ApiMethod<
  ForwardMessagesOptions,
  RawMessageId[]
> {
  readonly method = 'forwardMessages';

  constructor(payload: ForwardMessagesOptions) {
    super(payload);
  }
}

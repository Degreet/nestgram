import { ApiMethod } from './api-method';
import type { RawMessageId } from '../../events/raw-update.types';

export interface ForwardMessagesOptions {
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  from_chat_id: number | string;
  message_ids: number[];
  disable_notification?: boolean;
  protect_content?: boolean;
}

/**
 * Use this method to forward multiple messages of any kind. If some of the specified messages can't be found or forwarded, they are skipped. Service messages and messages with protected content can't be forwarded. Album grouping is kept for forwarded messages. On success, an array of MessageId of the sent messages is returned.
 * @see https://core.telegram.org/bots/api#forwardmessages
 */
export class ForwardMessages extends ApiMethod<
  ForwardMessagesOptions,
  RawMessageId[]
> {
  readonly method = 'forwardMessages';

  constructor(payload: ForwardMessagesOptions) {
    super(payload);
  }
}

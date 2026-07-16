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

/**
 * Use this method to copy messages of any kind. If some of the specified messages can't be found or copied, they are skipped. Service messages, paid media messages, giveaway messages, giveaway winners messages, and invoice messages can't be copied. A quiz poll can be copied only if the value of the field correct_option_id is known to the bot. The method is analogous to the method forwardMessages, but the copied messages don't have a link to the original message. Album grouping is kept for copied messages. On success, an Array of MessageId of the sent messages is returned.
 * @see https://core.telegram.org/bots/api#copymessages
 */
export class CopyMessages extends ApiMethod<
  CopyMessagesOptions,
  RawMessageId[]
> {
  readonly method = 'copyMessages';

  constructor(payload: CopyMessagesOptions) {
    super(payload);
  }
}

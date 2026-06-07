import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import type { RawSuggestedPostParameters } from '../../events/raw-update.types';

export interface ForwardMessageOptions {
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  from_chat_id: number | string;
  video_start_timestamp?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_effect_id?: string;
  suggested_post_parameters?: RawSuggestedPostParameters;
  message_id: number;
}

/**
 * Use this method to forward messages of any kind. Service messages and messages with protected content can't be forwarded. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#forwardmessage
 */
export class ForwardMessage extends ApiMethod<ForwardMessageOptions, Message> {
  readonly method = 'forwardMessage';

  constructor(payload: ForwardMessageOptions) {
    super(payload);
  }

  wrap(raw: unknown, bot: BotService): Message {
    return new Message(bot, raw as Partial<Message>);
  }
}

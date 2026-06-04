import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';

export interface ForwardMessageOptions {
  chat_id: number | string;
  message_thread_id?: number;
  from_chat_id: number | string;
  video_start_timestamp?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_id: number;
}

export class ForwardMessage extends ApiMethod<ForwardMessageOptions, Message> {
  readonly method = 'forwardMessage';

  constructor(payload: ForwardMessageOptions) {
    super(payload);
  }

  wrap(raw: unknown, bot: BotService): Message {
    return new Message(bot, raw as Partial<Message>);
  }
}

import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';

export interface ForwardMessageOptions {
  chat_id: number | string;
  from_chat_id: number | string;
  message_id: number;
  message_thread_id?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
}

/** Forwards a message to another chat. Returns the forwarded `Message`. */
export class ForwardMessage extends ApiMethod<ForwardMessageOptions, Message> {
  readonly method = 'forwardMessage';

  constructor(payload: ForwardMessageOptions) {
    super(payload);
  }

  wrap(raw: unknown, bot: BotService): Message {
    return new Message(bot, raw as Partial<Message>);
  }
}

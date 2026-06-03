import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import { InputFile } from '../input-file';

export interface SendPhotoOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  photo: string | InputFile;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  show_caption_above_media?: any;
  has_spoiler?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: any;
  reply_markup?: any;
}

export class SendPhoto extends ApiMethod<SendPhotoOptions, Message> {
  readonly method = 'sendPhoto';

  constructor(payload: SendPhotoOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return this.payload?.photo instanceof InputFile;
  }

  wrap(raw: unknown, bot: BotService): Message {
    return new Message(bot, raw as Partial<Message>);
  }
}

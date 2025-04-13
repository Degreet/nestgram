import { ApiMethod } from './ApiMethod';
import { Message } from '../telegramObjects';
import { BotService } from '../bot';
import { InputFile } from '../types';

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
  protected readonly methodName = 'sendPhoto';

  constructor(readonly botService: BotService, options: SendPhotoOptions) {
    super(botService.token, options);
  }

  get hasMedia() {
    return this.options.photo instanceof InputFile;
  }

  interceptor(object: Message) {
    return new Message(this.botService, object);
  }
}

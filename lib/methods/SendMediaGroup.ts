import { ApiMethod } from './ApiMethod';
import { Message } from '../telegramObjects';
import { BotService } from '../bot';
import { InputFile } from '../types';
import {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from '../types/InputMedia';

export interface SendMediaGroupOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  media: Array<
    InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
  >;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: any;
}

export class SendMediaGroup extends ApiMethod<
  SendMediaGroupOptions,
  Message[]
> {
  protected readonly methodName = 'sendMediaGroup';
  readonly isAttachMedia = true;

  constructor(readonly botService: BotService, options: SendMediaGroupOptions) {
    super(botService.token, options);
  }

  get hasMedia() {
    return this.options.media.some((media) => media.media instanceof InputFile);
  }

  interceptor(objects: Message[]) {
    return objects.map((object) => new Message(this.botService, object));
  }
}

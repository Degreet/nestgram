import { TelegramObject } from './telegram-object';
import { BotService } from '../api';
import {
  SendMediaGroupOptions,
  SendMessageOptions,
  SendPhotoOptions,
} from '../api/methods';
import { UpdateType } from '../decorators';
import { InputFile } from '../types';
import {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from '../types/InputMedia';

@UpdateType(
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  'business_message',
  'edited_business_message',
)
export class Message extends TelegramObject {
  message_id: number;
  message_thread_id?: number;
  from: any;
  chat: any;
  text?: string;
  caption?: string;
  reply_markup?: any;
  entities?: any[];
  caption_entities?: any[];

  constructor(private readonly botService: BotService, from: Partial<Message>) {
    super();
    Object.assign(this, from);
  }

  answer(text: string, options?: Partial<SendMessageOptions>) {
    return this.botService.sendMessage(this.chat.id, text, options);
  }

  answerPhoto(photo: string | InputFile, options?: Partial<SendPhotoOptions>) {
    return this.botService.sendPhoto(this.chat.id, photo, options);
  }

  answerMediaGroup(
    media: Array<
      InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
    >,
    options?: Partial<SendMediaGroupOptions>,
  ) {
    return this.botService.sendMediaGroup(this.chat.id, media, options);
  }

  reply(text: string, options?: Partial<SendMessageOptions>) {
    return this.botService.sendMessage(this.chat.id, text, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyPhoto(photo: string | InputFile, options?: Partial<SendPhotoOptions>) {
    return this.botService.sendPhoto(this.chat.id, photo, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyMediaGroup(
    media: Array<
      InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
    >,
    options?: Partial<SendMediaGroupOptions>,
  ) {
    return this.botService.sendMediaGroup(this.chat.id, media, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }
}

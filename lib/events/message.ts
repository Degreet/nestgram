import { TelegramObject } from './telegram-object';
import { BotService, MethodOptions } from '../api';
import {
  EditMessageReplyMarkupOptions,
  EditMessageTextOptions,
  SendMediaGroupOptions,
  SendMessageOptions,
  SendPhotoOptions,
} from '../api/methods';
import { UpdateType } from '../decorators';
import { InputFile } from '../api/input-file';
import {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from '../api/input-media';
import type {
  RawAnimation,
  RawAudio,
  RawContact,
  RawDice,
  RawDocument,
  RawLocation,
  RawPhotoSize,
  RawPoll,
  RawSticker,
  RawVenue,
  RawVideo,
  RawVideoNote,
  RawVoice,
} from './raw-update.types';

@UpdateType(
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  'business_message',
  'edited_business_message',
)
export class Message extends TelegramObject {
  message_id!: number;
  message_thread_id?: number;
  from: any;
  chat: any;
  text?: string;
  caption?: string;
  reply_markup?: any;
  entities?: any[];
  caption_entities?: any[];

  // Content (one is present per message). Media stays raw here; the rich
  // download helpers (`photo.save(...)`) land with the media task.
  photo?: RawPhotoSize[];
  video?: RawVideo;
  animation?: RawAnimation;
  audio?: RawAudio;
  voice?: RawVoice;
  document?: RawDocument;
  video_note?: RawVideoNote;
  sticker?: RawSticker;
  dice?: RawDice;
  location?: RawLocation;
  contact?: RawContact;
  poll?: RawPoll;
  venue?: RawVenue;

  constructor(private readonly botService: BotService, from: Partial<Message>) {
    super();
    Object.assign(this, from);
  }

  answer(text: string, options?: MethodOptions<SendMessageOptions>) {
    return this.botService.sendMessage(this.chat.id, text, options);
  }

  answerPhoto(
    photo: string | InputFile,
    options?: MethodOptions<SendPhotoOptions>,
  ) {
    return this.botService.sendPhoto(this.chat.id, photo, options);
  }

  answerMediaGroup(
    media: Array<
      InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
    >,
    options?: MethodOptions<SendMediaGroupOptions>,
  ) {
    return this.botService.sendMediaGroup(this.chat.id, media, options);
  }

  reply(text: string, options?: MethodOptions<SendMessageOptions>) {
    return this.botService.sendMessage(this.chat.id, text, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  editText(text: string, options?: MethodOptions<EditMessageTextOptions>) {
    return this.botService.editMessageText(
      this.chat.id,
      this.message_id,
      text,
      options,
    );
  }

  editReplyMarkup(
    reply_markup: unknown,
    options?: MethodOptions<EditMessageReplyMarkupOptions>,
  ) {
    return this.botService.editMessageReplyMarkup(
      this.chat.id,
      this.message_id,
      reply_markup,
      options,
    );
  }

  replyPhoto(
    photo: string | InputFile,
    options?: MethodOptions<SendPhotoOptions>,
  ) {
    return this.botService.sendPhoto(this.chat.id, photo, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyMediaGroup(
    media: Array<
      InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
    >,
    options?: MethodOptions<SendMediaGroupOptions>,
  ) {
    return this.botService.sendMediaGroup(this.chat.id, media, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }
}

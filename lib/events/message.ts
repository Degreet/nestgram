import { TelegramObject } from './telegram-object';
import { BotService, MethodOptions } from '../api';
import {
  CopyMessageOptions,
  DeleteMessageOptions,
  EditMessageReplyMarkupOptions,
  EditMessageTextOptions,
  ForwardMessageOptions,
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
import type { RawMessage } from './raw-update.types';
import {
  Animation,
  Audio,
  Document,
  Photo,
  Sticker,
  Video,
  VideoNote,
  Voice,
} from './media';

/**
 * Downloadable media fields the rich event replaces with self-downloading
 * wrappers (`.save(path)` / `.stream()`); every other `RawMessage` field is
 * exposed as-is via declaration merging.
 */
type WrappedMedia =
  | 'photo'
  | 'video'
  | 'animation'
  | 'audio'
  | 'voice'
  | 'document'
  | 'video_note'
  | 'sticker';

export interface Message extends Omit<RawMessage, WrappedMedia> {}

@UpdateType(
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  'business_message',
  'edited_business_message',
)
export class Message extends TelegramObject {
  // Content (one is present per message). Downloadable media is wrapped into a
  // rich object with `.save(path)` / `.stream()`; non-file content stays raw.
  photo?: Photo;
  video?: Video;
  animation?: Animation;
  audio?: Audio;
  voice?: Voice;
  document?: Document;
  video_note?: VideoNote;
  sticker?: Sticker;

  constructor(
    private readonly botService: BotService,
    from: Partial<RawMessage>,
  ) {
    super();
    Object.assign(this, from);

    // `from` is the raw wire message; wrap its downloadable media into rich,
    // self-downloading objects (the raw/rich boundary, like the event factory).
    const raw = from;
    if (raw.photo) this.photo = new Photo(botService, raw.photo);
    if (raw.video) this.video = new Video(botService, raw.video);
    if (raw.animation)
      this.animation = new Animation(botService, raw.animation);
    if (raw.audio) this.audio = new Audio(botService, raw.audio);
    if (raw.voice) this.voice = new Voice(botService, raw.voice);
    if (raw.document) this.document = new Document(botService, raw.document);
    if (raw.video_note)
      this.video_note = new VideoNote(botService, raw.video_note);
    if (raw.sticker) this.sticker = new Sticker(botService, raw.sticker);
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
    reply_markup: EditMessageReplyMarkupOptions['reply_markup'],
    options?: MethodOptions<EditMessageReplyMarkupOptions>,
  ) {
    return this.botService.editMessageReplyMarkup(
      this.chat.id,
      this.message_id,
      {
        reply_markup,
        ...options,
      },
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

  /** Delete this message. */
  delete(options?: MethodOptions<DeleteMessageOptions>) {
    return this.botService.deleteMessage(
      this.chat.id,
      this.message_id,
      options,
    );
  }

  /** Forward this message to another chat (returns the forwarded `Message`). */
  forward(
    chat_id: number | string,
    options?: MethodOptions<ForwardMessageOptions>,
  ) {
    return this.botService.forwardMessage(
      chat_id,
      this.chat.id,
      this.message_id,
      options,
    );
  }

  /** Copy this message to another chat without a forward header. */
  copy(chat_id: number | string, options?: MethodOptions<CopyMessageOptions>) {
    return this.botService.copyMessage(
      chat_id,
      this.chat.id,
      this.message_id,
      options,
    );
  }
}

import { TelegramObject } from './telegram-object';
import { AlbumItem, BotService, MediaGroup, MethodOptions } from '../api';
import {
  AnswerGuestQueryOptions,
  CopyMessageOptions,
  DeleteMessageOptions,
  EditMessageMediaOptions,
  EditMessageReplyMarkupOptions,
  EditMessageTextOptions,
  ForwardMessageOptions,
  SendAnimationOptions,
  SendAudioOptions,
  SendDocumentOptions,
  SendMediaGroupOptions,
  SendMessageOptions,
  SendPhotoOptions,
  SendStickerOptions,
  SendVideoNoteOptions,
  SendVideoOptions,
  SendVoiceOptions,
  SetMessageReactionOptions,
} from '../api/methods';
import { UpdateType } from '../decorators';
import { InputFile } from '../api/input-file';
import { NestgramError } from '../exceptions';
import type { StreamOptions, StreamSource } from '../streaming';
import type {
  RawInlineQueryResult,
  RawInputRichMessage,
  RawMessage,
} from './raw-update.types';
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
  'guest_message',
)
export class Message extends TelegramObject {
  /** The `ReactionType` discriminant for a standard emoji reaction. */
  private static readonly EMOJI_REACTION_TYPE = 'emoji' as const;

  /** Unwrap a `MediaGroup` builder to its raw item array; pass an array through. */
  private static albumItems(media: AlbumItem[] | MediaGroup): AlbumItem[] {
    return media instanceof MediaGroup ? media.toJSON() : media;
  }

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

  /**
   * Refuse an action that would reply to `this.chat.id` when this is a guest
   * message: a guest message's chat id can resolve to a DIFFERENT real chat (per
   * the spec), so a same-chat reply risks misdelivery. A guest exchange is
   * answered via {@link answerGuest} instead.
   */
  private assertNotGuest(action: string): void {
    if (this.guest_query_id) {
      throw new NestgramError(
        `message.${action}() can't reply to a guest message — its chat id may ` +
          'resolve to a different real chat (per the spec). Use ' +
          'message.answerGuest(result) (or bot.answerGuestQuery).',
      );
    }
  }

  answer(text: string, options?: MethodOptions<SendMessageOptions>) {
    this.assertNotGuest('answer');
    return this.botService.sendMessage(this.chat.id, text, options);
  }

  /**
   * Stream a reply into this chat live — consume an async iterable of text
   * deltas (an LLM token stream, an `async function*`) and animate it via the
   * native rich-message draft, persisting the final text when the stream ends.
   * Resolves the sent {@link Message}, or `undefined` for an empty stream.
   * Private-chat only — throws in a group (see {@link BotService.streamMessage}).
   */
  answerStream(source: StreamSource, options?: StreamOptions) {
    this.assertNotGuest('answerStream');
    return this.botService.streamMessage(this.chat.id, source, options);
  }

  /**
   * Answer THIS guest message via `answerGuestQuery` — the one valid reply for a
   * guest exchange: a single `InlineQueryResult`, no follow-up, typing, or
   * reaction. Throws if the message is not guest-origin (no `guest_query_id`).
   * The guest counterpart to {@link answer}, whose same-chat reply is unsafe here.
   */
  answerGuest(
    result: RawInlineQueryResult,
    options?: MethodOptions<
      Omit<AnswerGuestQueryOptions, 'guest_query_id' | 'result'>
    >,
  ) {
    if (!this.guest_query_id) {
      throw new NestgramError(
        'message.answerGuest() is only valid on a guest message (this message ' +
          'carries no guest_query_id).',
      );
    }
    return this.botService.answerGuestQuery(
      this.guest_query_id,
      result,
      options,
    );
  }

  answerPhoto(
    photo: string | InputFile,
    options?: MethodOptions<SendPhotoOptions>,
  ) {
    return this.botService.sendPhoto(this.chat.id, photo, options);
  }

  answerMediaGroup(
    media: AlbumItem[] | MediaGroup,
    options?: MethodOptions<SendMediaGroupOptions>,
  ) {
    return this.botService.sendMediaGroup(
      this.chat.id,
      Message.albumItems(media),
      options,
    );
  }

  answerVideo(
    video: string | InputFile,
    options?: MethodOptions<SendVideoOptions>,
  ) {
    return this.botService.sendVideo(this.chat.id, video, options);
  }

  answerAudio(
    audio: string | InputFile,
    options?: MethodOptions<SendAudioOptions>,
  ) {
    return this.botService.sendAudio(this.chat.id, audio, options);
  }

  answerDocument(
    document: string | InputFile,
    options?: MethodOptions<SendDocumentOptions>,
  ) {
    return this.botService.sendDocument(this.chat.id, document, options);
  }

  answerAnimation(
    animation: string | InputFile,
    options?: MethodOptions<SendAnimationOptions>,
  ) {
    return this.botService.sendAnimation(this.chat.id, animation, options);
  }

  answerVoice(
    voice: string | InputFile,
    options?: MethodOptions<SendVoiceOptions>,
  ) {
    return this.botService.sendVoice(this.chat.id, voice, options);
  }

  answerVideoNote(
    video_note: string | InputFile,
    options?: MethodOptions<SendVideoNoteOptions>,
  ) {
    return this.botService.sendVideoNote(this.chat.id, video_note, options);
  }

  answerSticker(
    sticker: string | InputFile,
    options?: MethodOptions<SendStickerOptions>,
  ) {
    return this.botService.sendSticker(this.chat.id, sticker, options);
  }

  reply(text: string, options?: MethodOptions<SendMessageOptions>) {
    return this.botService.sendMessage(this.chat.id, text, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  /** {@link answerStream} that quotes this message on the persisted reply. */
  replyStream(source: StreamSource, options?: StreamOptions) {
    this.assertNotGuest('replyStream');
    return this.botService.streamMessage(this.chat.id, source, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  // Options omit the content fields: the slot already carries text OR
  // rich_message, and a second copy via options would send both — invalid.
  editText(
    content: string | RawInputRichMessage,
    options?: MethodOptions<
      Omit<EditMessageTextOptions, 'text' | 'rich_message'>
    >,
  ) {
    return this.botService.editMessageText(
      this.chat.id,
      this.message_id,
      content,
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

  // Options omit `media`: the content slot already carries it; a second copy via
  // options would send two media objects.
  editMedia(
    media: EditMessageMediaOptions['media'],
    options?: MethodOptions<Omit<EditMessageMediaOptions, 'media'>>,
  ) {
    return this.botService.editMessageMedia(
      this.chat.id,
      this.message_id,
      media,
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
    media: AlbumItem[] | MediaGroup,
    options?: MethodOptions<SendMediaGroupOptions>,
  ) {
    return this.botService.sendMediaGroup(
      this.chat.id,
      Message.albumItems(media),
      {
        reply_parameters: { message_id: this.message_id },
        ...options,
      },
    );
  }

  replyVideo(
    video: string | InputFile,
    options?: MethodOptions<SendVideoOptions>,
  ) {
    return this.botService.sendVideo(this.chat.id, video, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyAudio(
    audio: string | InputFile,
    options?: MethodOptions<SendAudioOptions>,
  ) {
    return this.botService.sendAudio(this.chat.id, audio, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyDocument(
    document: string | InputFile,
    options?: MethodOptions<SendDocumentOptions>,
  ) {
    return this.botService.sendDocument(this.chat.id, document, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyAnimation(
    animation: string | InputFile,
    options?: MethodOptions<SendAnimationOptions>,
  ) {
    return this.botService.sendAnimation(this.chat.id, animation, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyVoice(
    voice: string | InputFile,
    options?: MethodOptions<SendVoiceOptions>,
  ) {
    return this.botService.sendVoice(this.chat.id, voice, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replyVideoNote(
    video_note: string | InputFile,
    options?: MethodOptions<SendVideoNoteOptions>,
  ) {
    return this.botService.sendVideoNote(this.chat.id, video_note, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }

  replySticker(
    sticker: string | InputFile,
    options?: MethodOptions<SendStickerOptions>,
  ) {
    return this.botService.sendSticker(this.chat.id, sticker, {
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

  /** React to this message with a single emoji (replaces any existing reaction). */
  react(emoji: string, options?: MethodOptions<SetMessageReactionOptions>) {
    return this.botService.setMessageReaction(this.chat.id, this.message_id, {
      reaction: [{ type: Message.EMOJI_REACTION_TYPE, emoji }],
      ...options,
    });
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

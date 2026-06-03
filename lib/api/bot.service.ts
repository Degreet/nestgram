import { Inject, Injectable, Logger } from '@nestjs/common';

import { BotOptions } from './bot-options';
import { InputFile } from './input-file';
import { Providers } from '../providers';

import {
  SendMessage,
  GetMe,
  GetUpdates,
  SendMessageOptions,
  GetUpdatesOptions,
  DeleteWebhookOptions,
  DeleteWebhook,
  AnswerCallbackQuery,
  AnswerCallbackQueryOptions,
  SendPhotoOptions,
  SendPhoto,
  SendMediaGroup,
  SendMediaGroupOptions,
  EditMessageText,
  EditMessageTextOptions,
  EditMessageReplyMarkup,
  EditMessageReplyMarkupOptions,
} from './methods';
import {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from './input-media';

@Injectable()
export class BotService {
  readonly token: string;
  private readonly defaultParseMode?: string;
  private readonly logger = new Logger(BotService.name);

  constructor(@Inject(Providers.BOT_OPTIONS) options: BotOptions) {
    this.token = options.token;
    this.defaultParseMode = options.parseMode;
  }

  /**
   * Apply the default `parse_mode` to a send that omits one. An explicit
   * `parse_mode` key (any value, including `undefined`) is left untouched, so a
   * call can override the default or opt out per call.
   *
   * `entities` / `caption_entities` are Telegram's alternative to `parse_mode`
   * ("specified instead of parse_mode") — when present, the default is not
   * injected, so it can't shadow caller-provided entities. Supplying both an
   * explicit `parse_mode` and entities on one call is a mistake (Telegram
   * ignores `parse_mode` in that case), so it is warned about.
   */
  private withParseMode<T extends { parse_mode?: string }>(
    options: Partial<T> | undefined,
  ): Partial<T> {
    const opts = (options ?? {}) as Partial<T> & {
      entities?: unknown;
      caption_entities?: unknown;
    };
    const hasEntities = 'entities' in opts || 'caption_entities' in opts;
    const hasParseMode = 'parse_mode' in opts;

    if (hasEntities && hasParseMode) {
      this.logger.warn(
        'A send was given both parse_mode and entities; Telegram ignores ' +
          'parse_mode and uses the entities. Pass only one.',
      );
    }

    if (!this.defaultParseMode || hasParseMode || hasEntities) {
      return opts;
    }
    return { ...opts, parse_mode: this.defaultParseMode };
  }

  deleteWebhook(options?: Partial<DeleteWebhookOptions>) {
    return new DeleteWebhook(this, options).fetch();
  }

  getMe() {
    return new GetMe(this).fetch();
  }

  getUpdates(options?: Partial<GetUpdatesOptions>, signal?: AbortSignal) {
    return new GetUpdates(this, options).fetch(signal);
  }

  sendMessage(
    chat_id: number | string,
    text: string,
    options?: Partial<SendMessageOptions>,
  ) {
    return new SendMessage(this, {
      chat_id,
      text,
      ...this.withParseMode(options),
    }).fetch();
  }

  sendPhoto(
    chat_id: number | string,
    photo: string | InputFile,
    options?: Partial<SendPhotoOptions>,
  ) {
    return new SendPhoto(this, {
      chat_id,
      photo,
      ...this.withParseMode(options),
    }).fetch();
  }

  sendMediaGroup(
    chat_id: number | string,
    media: Array<
      InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
    >,
    options?: Partial<SendMediaGroupOptions>,
  ) {
    return new SendMediaGroup(this, {
      chat_id,
      media,
      ...(options ?? {}),
    }).fetch();
  }

  answerCallbackQuery(
    callback_query_id: string,
    options?: Partial<AnswerCallbackQueryOptions>,
  ) {
    return new AnswerCallbackQuery(this, {
      callback_query_id,
      ...(options ?? {}),
    }).fetch();
  }

  editMessageText(
    chat_id: number | string,
    message_id: number,
    text: string,
    options?: Partial<EditMessageTextOptions>,
  ) {
    return new EditMessageText(this, {
      chat_id,
      message_id,
      text,
      ...this.withParseMode(options),
    }).fetch();
  }

  editMessageReplyMarkup(
    chat_id: number | string,
    message_id: number,
    reply_markup: unknown,
    options?: Partial<EditMessageReplyMarkupOptions>,
  ) {
    return new EditMessageReplyMarkup(this, {
      chat_id,
      message_id,
      reply_markup,
      ...(options ?? {}),
    }).fetch();
  }
}

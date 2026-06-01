import { Inject, Injectable } from '@nestjs/common';

import { BotOptions } from './bot-options';
import { InputFile } from './input-file';
import { Providers } from '../enums';

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

  constructor(@Inject(Providers.BOT_OPTIONS) options: BotOptions) {
    this.token = options.token;
  }

  deleteWebhook(options?: Partial<DeleteWebhookOptions>) {
    return new DeleteWebhook(this, options).fetch();
  }

  getMe() {
    return new GetMe(this).fetch();
  }

  getUpdates(options?: Partial<GetUpdatesOptions>) {
    return new GetUpdates(this, options).fetch();
  }

  sendMessage(
    chat_id: number | string,
    text: string,
    options?: Partial<SendMessageOptions>,
  ) {
    return new SendMessage(this, {
      chat_id,
      text,
      ...(options ?? {}),
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
      ...(options ?? {}),
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
}

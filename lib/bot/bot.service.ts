import { Inject, Injectable } from '@nestjs/common';

import { BotOptions } from '../types';
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
} from '../methods';

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

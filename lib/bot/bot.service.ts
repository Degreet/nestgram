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
} from '../methods';

@Injectable()
export class BotService {
  public readonly token: string;

  constructor(@Inject(Providers.BOT_OPTIONS) options: BotOptions) {
    this.token = options.token;
  }

  deleteWebhook(options?: DeleteWebhookOptions) {
    return new DeleteWebhook(this, options).fetch();
  }

  getMe() {
    return new GetMe(this).fetch();
  }

  getUpdates(options?: GetUpdatesOptions) {
    return new GetUpdates(this, options).fetch();
  }

  sendMessage(
    chat_id: number | string,
    text: string,
    options?: SendMessageOptions,
  ) {
    return new SendMessage(this, {
      chat_id,
      text,
      ...(options ?? {}),
    }).fetch();
  }
}

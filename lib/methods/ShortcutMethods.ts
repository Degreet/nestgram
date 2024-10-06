import { Injectable } from '@nestjs/common';
import { BotService } from '../bot';

import { DeleteWebhookOptions } from './DeleteWebhook';
import { GetUpdatesOptions } from './GetUpdates';
import { SendMessageOptions } from './SendMessage';

@Injectable()
export abstract class ShortcutMethods {
  protected constructor(private readonly botService: BotService) {}

  protected chat_id: string | number | void;

  deleteWebhook(options?: DeleteWebhookOptions) {
    return this.botService.deleteWebhook(options);
  }

  getMe() {
    return this.botService.getMe();
  }

  getUpdates(options?: GetUpdatesOptions) {
    return this.botService.getUpdates(options);
  }

  sendMessage(text: string, options?: SendMessageOptions) {
    const chat_id = this.chat_id ?? options.chat_id;
    if (!chat_id) {
      throw new Error('chat_id is not defined');
    }
    return this.botService.sendMessage(chat_id, text, options);
  }
}

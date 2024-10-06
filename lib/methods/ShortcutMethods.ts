import { BotService } from '../bot';

import { DeleteWebhookOptions } from './DeleteWebhook';
import { GetUpdatesOptions } from './GetUpdates';
import { SendMessageOptions } from './SendMessage';

export abstract class ShortcutMethods {
  protected constructor(private readonly botService: BotService) {}

  protected abstract chatIdShortcut: string | number | void;

  deleteWebhook(options?: DeleteWebhookOptions) {
    return this.botService.deleteWebhook(options);
  }

  getMe() {
    return this.botService.getMe();
  }

  getUpdates(options?: GetUpdatesOptions) {
    return this.botService.getUpdates(options);
  }

  answer(text: string, options?: SendMessageOptions) {
    const chatId = this.chatIdShortcut ?? options.chat_id;
    if (!chatId) {
      throw new Error('chat_id is not defined');
    }
    return this.botService.sendMessage(chatId, text, options);
  }
}

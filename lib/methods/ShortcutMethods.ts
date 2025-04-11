import { BotService } from '../bot';

import { DeleteWebhookOptions } from './DeleteWebhook';
import { GetUpdatesOptions } from './GetUpdates';
import { SendMessageOptions } from './SendMessage';

export abstract class ShortcutMethods {
  constructor(private readonly botService: BotService) {}

  protected abstract chatId?: string | number | void;
  protected abstract messageId?: number | void;

  deleteWebhook(options?: Partial<DeleteWebhookOptions>) {
    return this.botService.deleteWebhook(options);
  }

  getMe() {
    return this.botService.getMe();
  }

  getUpdates(options?: Partial<GetUpdatesOptions>) {
    return this.botService.getUpdates(options);
  }

  answer(text: string, options?: Partial<SendMessageOptions>) {
    const chatId = this.chatId ?? options.chat_id;
    if (!chatId) {
      throw new Error('chat_id is not defined');
    }
    return this.botService.sendMessage(chatId, text, options);
  }

  reply(text: string, options?: Partial<SendMessageOptions>) {
    const chatId = this.chatId ?? options.chat_id;
    const messageId = this.messageId;
    if (!chatId || !messageId) {
      throw new Error('chat_id && message_id must be specified');
    }
    return this.botService.sendMessage(chatId, text, {
      reply_parameters: { message_id: messageId },
      ...options,
    });
  }
}

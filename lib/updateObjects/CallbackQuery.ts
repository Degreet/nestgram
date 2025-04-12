import { UpdateObject } from './UpdateObject';
import { Message } from './Message';
import { BotService } from '../bot';
import { AnswerCallbackQueryOptions } from '../methods/AnswerCallbackQuery';

export class CallbackQuery extends UpdateObject {
  id: string;
  from: any;
  message?: Message;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;

  constructor(protected readonly botService: BotService) {
    super(botService);
  }

  protected objectReferences = {
    message: Message,
  };

  protected get chatId() {
    return this.from.id;
  }

  override answer(options?: Partial<AnswerCallbackQueryOptions>) {
    const callbackQueryId = this.id;
    if (!callbackQueryId) {
      throw new Error('callback_query_id is not defined');
    }
    return this.botService.answerCallbackQuery(callbackQueryId, options);
  }
}

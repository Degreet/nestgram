import { Message } from './Message';
import { BotService } from '../bot';
import { AnswerCallbackQueryOptions } from '../methods';
import { TelegramObject } from './TelegramObject';
import { UpdateType } from '../decorators';

@UpdateType('callback_query')
export class CallbackQuery extends TelegramObject {
  id: string;
  from: any;
  message?: Message;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;

  constructor(
    private readonly botService: BotService,
    from: Partial<CallbackQuery>,
  ) {
    super();
    Object.assign(this, from);
    TelegramObject.mutateObjects(botService, this, {
      message: Message,
    });
  }

  answer(options?: Partial<AnswerCallbackQueryOptions>) {
    return this.botService.answerCallbackQuery(this.id, options);
  }
}

import { Message } from './message';
import { BotService } from '../api';
import { AnswerCallbackQueryOptions } from '../api/methods';
import { TelegramObject } from './telegram-object';
import { UpdateType } from '../decorators';

@UpdateType('callback_query')
export class CallbackQuery extends TelegramObject {
  id!: string;
  from: any;
  message?: Message;
  inline_message_id?: string;
  chat_instance!: string;
  data?: string;
  game_short_name?: string;

  /** Whether `answer()` has been called — auto-answer checks this. */
  answered = false;

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

  answer(text?: string, options?: Partial<AnswerCallbackQueryOptions>) {
    this.answered = true;
    // Positional `text` is the explicit arg, so it wins over any `options.text`.
    return this.botService.answerCallbackQuery(this.id, { ...options, text });
  }

  /** Answer with a modal alert — shortcut for `answer(text, { show_alert: true })`. */
  alert(text: string, options?: Partial<AnswerCallbackQueryOptions>) {
    return this.answer(text, { ...options, show_alert: true });
  }
}

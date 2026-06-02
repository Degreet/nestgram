import { Logger } from '@nestjs/common';

import { Message } from './message';
import { BotService } from '../api';
import { AnswerCallbackQueryOptions } from '../api/methods';
import type { EventState } from '../engine/context/event-state';
import { TelegramObject } from './telegram-object';
import { UpdateType } from '../decorators';

/** Key under which `answer()` records into the per-update state. */
const ANSWERED = Symbol('callback-answered');

@UpdateType('callback_query')
export class CallbackQuery extends TelegramObject {
  id!: string;
  from: any;
  message?: Message;
  inline_message_id?: string;
  chat_instance!: string;
  data?: string;
  game_short_name?: string;

  private readonly logger = new Logger(CallbackQuery.name);

  constructor(
    private readonly botService: BotService,
    from: Partial<CallbackQuery>,
    private readonly state?: EventState,
  ) {
    super();
    Object.assign(this, from);
    TelegramObject.mutateObjects(botService, this, {
      message: Message,
    });
  }

  /**
   * Whether this callback query has already been answered. Backed by the
   * per-update state, so any interceptor (built-in or your own) can read it —
   * this is how auto-answer knows not to answer again.
   */
  get isAnswered(): boolean {
    return this.state?.get(ANSWERED) === true;
  }

  answer(text?: string, options?: Partial<AnswerCallbackQueryOptions>) {
    if (this.isAnswered) {
      // Telegram rejects a second answer for the same query — surface the
      // likely mistake. (Exact API behaviour to be confirmed live, task #13.)
      this.logger.warn('Callback query answered more than once');
    }
    this.state?.set(ANSWERED, true);
    // Positional `text` is the explicit arg, so it wins over any `options.text`.
    return this.botService.answerCallbackQuery(this.id, { ...options, text });
  }

  /** Answer with a modal alert — shortcut for `answer(text, { show_alert: true })`. */
  alert(text: string, options?: Partial<AnswerCallbackQueryOptions>) {
    return this.answer(text, { ...options, show_alert: true });
  }
}

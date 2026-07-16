import { Logger } from '@nestjs/common';

import { Message } from './message';
import { BotService, MethodOptions } from '../api';
import { AnswerCallbackQueryOptions, SendMessageOptions } from '../api/methods';
import { NestgramError } from '../exceptions';
import type { EventState } from '../engine/context/event-state';
import type { RawCallbackQuery } from './raw-update.types';
import { TelegramObject } from './telegram-object';
import { UpdateType } from '../decorators';

/** Key under which `answer()` records into the per-update state. */
const ANSWERED = Symbol('callback-answered');

export interface CallbackQuery extends Omit<RawCallbackQuery, 'message'> {}

@UpdateType('callback_query')
export class CallbackQuery extends TelegramObject {
  /** The originating message, wrapped into the rich event (when accessible). */
  message?: Message;

  private readonly logger = new Logger(CallbackQuery.name);

  constructor(
    private readonly botService: BotService,
    from: Partial<RawCallbackQuery>,
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

  answer(text?: string, options?: MethodOptions<AnswerCallbackQueryOptions>) {
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
  alert(text: string, options?: MethodOptions<AnswerCallbackQueryOptions>) {
    return this.answer(text, { ...options, show_alert: true });
  }

  /**
   * Reply with an ephemeral message — a full message visible ONLY to the user
   * who tapped the button, in the group/supergroup it came from and bound to
   * this query. Unlike {@link answer} (a toast/alert), it takes a keyboard,
   * parse mode, etc. Group/supergroup only. Resolves the sent {@link Message};
   * edit or remove it with its `editEphemeral()` / `deleteEphemeral()` (its
   * normal `.editText()` / `.delete()` refuse — an ephemeral message has no
   * real `message_id`).
   */
  answerEphemeral(
    text: string,
    options?: MethodOptions<
      Omit<SendMessageOptions, 'receiver_user_id' | 'callback_query_id'>
    >,
  ) {
    if (!this.message) {
      throw new NestgramError(
        "callbackQuery.answerEphemeral() needs the query's originating chat, " +
          'but this is an inline-mode query (no attached chat message).',
      );
    }
    return this.botService.sendMessage(this.message.chat.id, text, {
      ...options,
      receiver_user_id: this.from.id,
      callback_query_id: this.id,
    });
  }
}

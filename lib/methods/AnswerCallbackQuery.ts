import { ApiMethod } from './ApiMethod';
import { BotService } from '../bot';

export interface AnswerCallbackQueryOptions {
  callback_query_id: string;
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

export class AnswerCallbackQuery extends ApiMethod<
  AnswerCallbackQueryOptions,
  true
> {
  protected readonly methodName = 'answerCallbackQuery';

  constructor(
    readonly botService: BotService,
    options: AnswerCallbackQueryOptions,
  ) {
    super(botService.token, options);
  }
}

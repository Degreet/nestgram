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
  protected readonly isFormData = false;

  constructor(
    public readonly botService: BotService,
    public options: AnswerCallbackQueryOptions,
  ) {
    super(botService.token, options);
  }
}

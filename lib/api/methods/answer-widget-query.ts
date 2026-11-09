import { ApiMethod } from './api-method';

export interface AnswerWidgetQueryOptions {
  widget_query_id: string;
  data?: string;
}

/**
 * Use this method to send an answer to a query from a widget. The query must be answered within 15 seconds. The answer is received only by the widget that sent the query and doesn't change data of the widget; use editMessageWidgetData or editSharedWidgetData to change it. On success, True is returned.
 * @see https://core.telegram.org/bots/api#answerwidgetquery
 */
export class AnswerWidgetQuery extends ApiMethod<
  AnswerWidgetQueryOptions,
  true
> {
  readonly method = 'answerWidgetQuery';

  constructor(payload: AnswerWidgetQueryOptions) {
    super(payload);
  }
}

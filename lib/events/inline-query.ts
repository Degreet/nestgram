import { CallOptions, MethodOptions } from '../api';
import { AnswerInlineQuery, AnswerInlineQueryOptions } from '../api/methods';
import { UpdateType } from '../decorators';
import { RawInlineQuery, RawInlineQueryResult } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface InlineQuery extends RawInlineQuery {}

/** An incoming inline query. Answer it with a list of results. */
@UpdateType('inline_query')
export class InlineQuery extends RichEvent {
  answer(
    results: RawInlineQueryResult[],
    options: MethodOptions<AnswerInlineQueryOptions> = {},
  ) {
    const { token, signal, ...rest } = options;
    return this.bot.call(
      new AnswerInlineQuery({ ...rest, inline_query_id: this.id, results }),
      { token, signal } satisfies CallOptions,
    );
  }
}

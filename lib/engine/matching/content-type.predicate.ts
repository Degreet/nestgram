import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import type { RawMessage } from '../../events/raw-update.types';
import { RoutePredicate } from './route-predicate';

/** A message content field, e.g. `text`, `photo`, `dice`. */
export type MessageContentField = keyof RawMessage;

/**
 * Matches a message that carries any of the given content fields — the engine
 * behind `@OnPhoto()`, `@OnText()`, `@OnMedia()`, etc. A union (more than one
 * field) matches if at least one is present, so `@OnTextOrCaption()` is
 * `['text', 'caption']` and `@OnMedia()` is the set of media fields.
 */
export class ContentTypePredicate implements RoutePredicate {
  private readonly fields: readonly MessageContentField[];

  constructor(fields: readonly MessageContentField[]) {
    this.fields = fields;
  }

  matches(ctx: TelegramExecutionContext): boolean {
    const message = ctx.update.message;
    if (!message) {
      return false;
    }
    return this.fields.some((field) => message[field] !== undefined);
  }
}

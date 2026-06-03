import type { TelegramExecutionContext } from '../context/telegram-execution-context';
import type { RawMessageEntity } from '../../events/raw-update.types';
import { RoutePredicate } from './route-predicate';

/**
 * Matches a message that contains at least one entity of the given type — the
 * engine behind `@OnEntity('email')` / `@OnEmail()`. Checks both `entities`
 * (text) and `caption_entities` (media captions).
 */
export class EntityPredicate implements RoutePredicate {
  constructor(private readonly type: string) {}

  matches(ctx: TelegramExecutionContext): boolean {
    const message = ctx.update.message;
    if (!message) {
      return false;
    }
    return this.has(message.entities) || this.has(message.caption_entities);
  }

  private has(entities?: RawMessageEntity[]): boolean {
    return entities?.some((entity) => entity.type === this.type) ?? false;
  }
}

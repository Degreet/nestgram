import type { TelegramExecutionContext } from '../engine/context';
import type { RoutePredicate } from '../engine/matching';
import type { DeepLinkDataDecoder } from './deep-link-data.types';

/**
 * The route predicate returned by `deepLinkData(...).filter()`. Matches a
 * command whose payload (the text after the command) decodes against the
 * definition — e.g. `@Command('start', Ref.filter())` runs only for a `/start`
 * carrying a `Ref` deep link, while a plain `@Command('start')` handles the rest.
 *
 * It implements the public {@link RoutePredicate}; imports from `engine` are
 * type-only. The payload is read inline rather than via the engine's
 * `extractPayload`, because a runtime import would close an
 * `engine -> api -> deep-links` module cycle (the same reason
 * `CallbackRoutePredicate` reads `callback_query.data` directly).
 */
export class DeepLinkDataPredicate implements RoutePredicate {
  constructor(private readonly definition: DeepLinkDataDecoder) {}

  matches(ctx: TelegramExecutionContext): boolean {
    const text = ctx.update.message?.text;
    if (text === undefined) {
      return false;
    }

    const firstSpace = text.indexOf(' ');
    if (firstSpace === -1) {
      return false;
    }

    const payload = text.slice(firstSpace + 1).trim();
    return payload.length > 0 && this.definition.parse(payload) !== null;
  }
}

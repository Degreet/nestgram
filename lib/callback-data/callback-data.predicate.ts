import type { TelegramExecutionContext } from '../engine/context';
import type { RoutePredicate } from '../engine/matching';
import type { CallbackDataDecoder } from './callback-data.types';

/**
 * The route predicate returned by `callbackData(...).filter()`. Matches a
 * callback query whose `data` decodes against the definition.
 *
 * Matching is side-effect-free: it decodes only to decide, then discards the
 * result. `@Data()` re-decodes on read, against the definition of the handler
 * that actually ran — so the value is never contaminated by a sibling route
 * the matcher merely evaluated. {@link parse} exposes that decode to `@Data()`.
 *
 * It implements the public {@link RoutePredicate}: typed callback data plugs
 * into routing through the same contract a user's own predicate would — nothing
 * privileged. Imports from `engine` are type-only, so the feature adds no
 * runtime dependency back onto the engine.
 */
export class CallbackDataPredicate implements RoutePredicate {
  constructor(private readonly definition: CallbackDataDecoder) {}

  matches(ctx: TelegramExecutionContext): boolean {
    const data = ctx.update.callback_query?.data;
    return data !== undefined && this.definition.parse(data) !== null;
  }

  /** Decode `data` against this definition, or `null` if it isn't this one's. */
  parse(data: string): object | null {
    return this.definition.parse(data);
  }
}

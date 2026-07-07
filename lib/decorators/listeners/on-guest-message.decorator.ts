import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'guest_message';

/**
 * Routes `guest_message` updates (a message from a guest, when guest mode is
 * enabled for the bot via BotFather) to the handler, whose first parameter is
 * the rich {@link Message}. Optional predicates narrow which updates match (all
 * must pass); stacks with other listeners on one method.
 *
 * A guest exchange is answered once with `bot.answerGuestQuery(...)` (an
 * `InlineQueryResult`), not the usual `message.answer(...)` reply — there is no
 * follow-up, typing, or reaction on it.
 */
export const OnGuestMessage = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

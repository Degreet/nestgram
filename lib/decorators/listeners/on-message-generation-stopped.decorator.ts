import { RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'stopped_message_generation';

/**
 * Routes `stopped_message_generation` updates to the handler, whose first
 * parameter is the rich {@link MessageGenerationStopped}. Optional predicates
 * narrow which updates match (all must pass); stacks with other listeners on
 * one method.
 */
export const OnMessageGenerationStopped = (
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(UPDATE_TYPE, ...predicates);
};

import { HearsPredicate, RoutePredicate } from '../../matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message';

/**
 * Handle a message whose text matches. `@Hears('hi')` matches exactly;
 * `@Hears(/^\d+$/)` tests the regex against the text.
 */
export const Hears = (
  pattern: string | RegExp,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return createListenerDecorator(
    UPDATE_TYPE,
    new HearsPredicate(pattern),
    ...predicates,
  );
};

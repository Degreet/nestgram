import { HearsKeyPredicate, RoutePredicate } from '../../engine/matching';
import { createListenerDecorator } from './create-listener-decorator';

const UPDATE_TYPE = 'message';

/**
 * Handle a message whose text matches a localized string by its translation key.
 * `@HearsKey('menu.remind')` matches the text of the `menu.remind` button as
 * rendered in the sender's locale — the i18n-aware `@Hears`, so a reply-keyboard
 * built from `t(...)` routes without hand-written per-locale predicates.
 */
export const HearsKey = (
  key: string,
  ...predicates: RoutePredicate[]
): MethodDecorator =>
  createListenerDecorator(
    UPDATE_TYPE,
    new HearsKeyPredicate(key),
    ...predicates,
  );

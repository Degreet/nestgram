import { EntityPredicate, RoutePredicate } from '../../engine/matching';
import { EntityType } from '../../events/entity-type';
import { createListenerDecorator } from './create-listener-decorator';

const MESSAGE = 'message';

/**
 * Fire when a message contains an entity of `type` (in its text or caption) —
 * e.g. `@OnEntity('email')`. The named aliases below cover the common types.
 * (A specific command is `@Command('start')`; `@OnEntity('bot_command')` matches
 * any command.)
 */
export const OnEntity = (
  type: string,
  ...predicates: RoutePredicate[]
): MethodDecorator =>
  createListenerDecorator(MESSAGE, new EntityPredicate(type), ...predicates);

const onEntity =
  (type: string) =>
  (...predicates: RoutePredicate[]): MethodDecorator =>
    OnEntity(type, ...predicates);

export const OnEmail = onEntity(EntityType.Email);
export const OnUrl = onEntity(EntityType.Url);
export const OnMention = onEntity(EntityType.Mention);
export const OnHashtag = onEntity(EntityType.Hashtag);
export const OnCashtag = onEntity(EntityType.Cashtag);
export const OnPhone = onEntity(EntityType.PhoneNumber);

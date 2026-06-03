import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { TelegramExecutionContext } from '../../engine/context';
import { extractEntities, extractEntity } from '../../engine/execution';
import { EntityType } from '../../events/entity-type';

/** Injects the text of the first entity of the given type (`@Entity('email')`). */
export const Entity = createParamDecorator(
  (type: string, ctx: ExecutionContext) =>
    extractEntity(TelegramExecutionContext.of(ctx), type),
);

/** Injects the text of every entity of the given type (`@Entities('url')`). */
export const Entities = createParamDecorator(
  (type: string, ctx: ExecutionContext) =>
    extractEntities(TelegramExecutionContext.of(ctx), type),
);

/** First / all email addresses found in the message. */
export const Email = (): ParameterDecorator => Entity(EntityType.Email);
export const Emails = (): ParameterDecorator => Entities(EntityType.Email);

/** First / all URLs. */
export const Url = (): ParameterDecorator => Entity(EntityType.Url);
export const Urls = (): ParameterDecorator => Entities(EntityType.Url);

/** First / all `@username` mentions. */
export const Mention = (): ParameterDecorator => Entity(EntityType.Mention);
export const Mentions = (): ParameterDecorator => Entities(EntityType.Mention);

/** First / all `#hashtags`. */
export const Hashtag = (): ParameterDecorator => Entity(EntityType.Hashtag);
export const Hashtags = (): ParameterDecorator => Entities(EntityType.Hashtag);

/** First / all `$cashtags`. */
export const Cashtag = (): ParameterDecorator => Entity(EntityType.Cashtag);
export const Cashtags = (): ParameterDecorator => Entities(EntityType.Cashtag);

/** First / all phone numbers. */
export const Phone = (): ParameterDecorator => Entity(EntityType.PhoneNumber);
export const Phones = (): ParameterDecorator =>
  Entities(EntityType.PhoneNumber);

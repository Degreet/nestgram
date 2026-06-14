import { SetMetadata } from '@nestjs/common';

import { RateLimitMetadata, type RateLimitRule } from './rate-limit.types';

/**
 * Overrides the module's default rate-limit rule for one route. Place it on a
 * handler method (just that handler) or on a `@Router()` class (every handler
 * in it, unless a handler sets its own). Resolution is handler-over-class, and
 * `@SkipRateLimit()` always wins over it.
 *
 * ```ts
 * @Command('start')
 * @RateLimit({ limit: 3, windowMs: 10_000 })
 * start(message: Message) {}
 * ```
 */
export const RateLimit = (
  rule: RateLimitRule,
): MethodDecorator & ClassDecorator =>
  SetMetadata(RateLimitMetadata.RULE, rule);

/**
 * Exempts a route from rate-limiting entirely. On a handler it exempts that
 * handler; on a `@Router()` class it exempts every handler in it. Wins over any
 * `@RateLimit` and over the module default.
 */
export const SkipRateLimit = (): MethodDecorator & ClassDecorator =>
  SetMetadata(RateLimitMetadata.SKIP, true);

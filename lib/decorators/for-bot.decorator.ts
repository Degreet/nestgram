import type { RoutePredicate } from '../engine/matching';
import { Metadata } from './metadata.enum';

/**
 * Scope a router or a handler to a single bot by name: it matches ONLY updates
 * that arrived on that bot, and falls through otherwise (so another router can
 * pick them up). Without it a router serves EVERY bot.
 *
 * ```ts
 * @Router()
 * @ForBot('support')           // whole router → support bot only
 * export class SupportRouter {
 *   @OnMessage()
 *   @ForBot('support')         // or per-handler
 *   handle(message: Message) {}
 * }
 * ```
 *
 * Built on the same `@Match` predicate mechanism as `@AnyState()`: it ANDs a
 * "current bot is `name`" predicate into the routes — on a class it applies to
 * every handler, on a method just that one. Reads `ctx.bot.name`, the per-update
 * bot the dispatcher threaded in.
 */
export const ForBot = (name: string): ClassDecorator & MethodDecorator => {
  const predicate: RoutePredicate = {
    matches: (ctx) => ctx.bot?.name === name,
  };
  return (
    target: object,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ): void => {
    // Method usage carries the method via the descriptor; class usage gets the
    // constructor as `target`. RouteExplorer reads MATCH from both.
    const carrier: object = descriptor ? descriptor.value : target;
    const existing: RoutePredicate[] =
      Reflect.getMetadata(Metadata.MATCH, carrier) ?? [];
    Reflect.defineMetadata(Metadata.MATCH, [...existing, predicate], carrier);
  };
};

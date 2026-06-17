import { Injectable } from '@nestjs/common';
import {
  DiscoveryService as NestDiscoveryService,
  MetadataScanner,
} from '@nestjs/core';

import { Metadata } from '../../decorators/metadata.enum';
import { ListenerOptions } from '../../decorators/listener-options';
import { getRouterPrefix } from '../../decorators/injectable/router.decorator';
import { isPrefixable, RoutePredicate } from '../matching';
import { Route } from './route.types';

/**
 * Builds the boot-time route table by scanning every provider for `@Router`
 * classes and collecting their listener-decorated methods.
 *
 * Runs ONCE at startup, not per update: the reflection cost is paid at boot and
 * the result is a flat, declaration-ordered `Route[]` the dispatcher matches
 * against. Each method's `Metadata.LISTENERS` is an array (a method can listen
 * to several update types), so every entry expands to its own route. The scan
 * reuses Nest's own `DiscoveryService` + `MetadataScanner`.
 */
@Injectable()
export class RouteExplorer {
  constructor(
    private readonly discovery: NestDiscoveryService,
    private readonly scanner: MetadataScanner,
  ) {}

  explore(): Route[] {
    const routes: Route[] = [];

    for (const wrapper of this.discovery.getProviders()) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') {
        continue;
      }

      const isRouter =
        Reflect.getMetadata(Metadata.ROUTER, instance.constructor) !==
        undefined;
      if (!isRouter) {
        continue;
      }

      // `@Router('ns')` namespaces this router's callback routes: the prefix
      // ANDs into every prefixable listener predicate (a string `@Action`), so
      // `done/:id` matches `ns/done/:id`. Undefined leaves predicates untouched.
      const prefix = getRouterPrefix(instance.constructor);

      // Class-level predicates (e.g. `@ForBot('support')` on the router) AND into
      // EVERY route the router declares — scoping the whole router to one bot.
      const classPredicates: RoutePredicate[] =
        Reflect.getMetadata(Metadata.MATCH, instance.constructor) ?? [];

      const prototype = Object.getPrototypeOf(instance);
      for (const methodName of this.scanner.getAllMethodNames(prototype)) {
        const listeners: ListenerOptions[] | undefined = Reflect.getMetadata(
          Metadata.LISTENERS,
          prototype[methodName],
        );
        if (!listeners?.length) {
          continue;
        }

        // Method-level predicates (`@Match`, and the `@AnyState()`/`@NoState()`
        // built on it) AND into EVERY route this method produces — independent
        // of how many listeners it stacks and of decorator order.
        const methodPredicates: RoutePredicate[] =
          Reflect.getMetadata(Metadata.MATCH, prototype[methodName]) ?? [];

        // Non-deferred listeners first, deferred (e.g. a scene step's reprompt)
        // after — so a fallback is tried only once the strict route declined,
        // regardless of the decorators' source order.
        for (const listener of RouteExplorer.orderListeners(listeners)) {
          const listenerPredicates = (listener.predicates ?? []).map(
            (predicate) =>
              prefix !== undefined && isPrefixable(predicate)
                ? predicate.withPrefix(prefix)
                : predicate,
          );
          routes.push({
            updateType: listener.updateType,
            predicates: [
              ...listenerPredicates,
              ...classPredicates,
              ...methodPredicates,
            ],
            instance,
            methodName,
            reply: listener.reply,
          });
        }
      }
    }

    return routes;
  }

  /**
   * Stable partition: non-deferred listeners keep their declaration order, then
   * deferred ones follow (also in order). A method's fallback routes therefore
   * always sort after its strict routes, independent of decorator placement.
   */
  private static orderListeners(
    listeners: ListenerOptions[],
  ): ListenerOptions[] {
    const strict = listeners.filter((listener) => !listener.deferred);
    const deferred = listeners.filter((listener) => listener.deferred);
    return [...strict, ...deferred];
  }
}

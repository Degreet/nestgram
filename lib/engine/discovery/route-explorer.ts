import { Injectable } from '@nestjs/common';
import {
  DiscoveryService as NestDiscoveryService,
  MetadataScanner,
} from '@nestjs/core';

import { Metadata } from '../../decorators/metadata.enum';
import { ListenerOptions } from '../../decorators/listener-options';
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

      const prototype = Object.getPrototypeOf(instance);
      for (const methodName of this.scanner.getAllMethodNames(prototype)) {
        const listeners: ListenerOptions[] | undefined = Reflect.getMetadata(
          Metadata.LISTENERS,
          prototype[methodName],
        );
        if (!listeners?.length) {
          continue;
        }

        for (const listener of listeners) {
          routes.push({
            updateType: listener.updateType,
            predicates: listener.predicates ?? [],
            instance,
            methodName,
          });
        }
      }
    }

    return routes;
  }
}

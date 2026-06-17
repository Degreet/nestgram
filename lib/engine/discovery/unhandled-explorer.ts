import { Injectable } from '@nestjs/common';
import {
  DiscoveryService as NestDiscoveryService,
  MetadataScanner,
} from '@nestjs/core';

import { Metadata } from '../../decorators/metadata.enum';

/** A discovered `@OnUnhandled` handler: the router instance and method to call. */
export interface UnhandledHandler {
  instance: object;
  methodName: string;
}

/**
 * Collects `@OnUnhandled` handlers from `@Router` classes at boot — the methods
 * the dispatcher runs when an update matches no route.
 *
 * Mirrors {@link RouteExplorer}'s scan and runs once at startup via Nest's
 * `DiscoveryService` + `MetadataScanner`. Separate from the route table because
 * these handlers all run (they observe, not compete), so they never enter
 * first-match routing.
 */
@Injectable()
export class UnhandledExplorer {
  constructor(
    private readonly discovery: NestDiscoveryService,
    private readonly scanner: MetadataScanner,
  ) {}

  explore(): UnhandledHandler[] {
    const handlers: UnhandledHandler[] = [];

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
        const isUnhandled = Reflect.getMetadata(
          Metadata.UNHANDLED,
          prototype[methodName],
        );
        if (isUnhandled) {
          handlers.push({ instance, methodName });
        }
      }
    }

    return handlers;
  }
}

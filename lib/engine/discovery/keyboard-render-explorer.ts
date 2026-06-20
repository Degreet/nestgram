import { Injectable } from '@nestjs/common';
import {
  DiscoveryService as NestDiscoveryService,
  MetadataScanner,
} from '@nestjs/core';

import { Metadata } from '../../decorators/metadata.enum';

/** A discovered `@KeyboardRender(...)` method: which group ids it renders, and where. */
export interface KeyboardRenderEntry {
  ids: string[];
  instance: object;
  methodName: string;
}

/**
 * Collects `@KeyboardRender(...)` methods from `@Router` classes at boot — the
 * `() => InlineKeyboard` builders the framework re-invokes to re-render a keyboard
 * in place after an interaction.
 *
 * Mirrors {@link UnhandledExplorer}'s scan (Nest's `DiscoveryService` +
 * `MetadataScanner`, once at startup). Separate from the route table because a
 * renderer is not a route — it is called directly with the current ambient state,
 * not run through ECC.
 */
@Injectable()
export class KeyboardRenderExplorer {
  constructor(
    private readonly discovery: NestDiscoveryService,
    private readonly scanner: MetadataScanner,
  ) {}

  explore(): KeyboardRenderEntry[] {
    const entries: KeyboardRenderEntry[] = [];

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
        const ids = Reflect.getMetadata(
          Metadata.KEYBOARD_RENDER,
          prototype[methodName],
        ) as string[] | undefined;
        if (ids) {
          entries.push({ ids, instance, methodName });
        }
      }
    }

    return entries;
  }
}

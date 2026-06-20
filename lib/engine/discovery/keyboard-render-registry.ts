import { Injectable, Logger, Optional } from '@nestjs/common';

import type { InlineKeyboard } from '../../keyboards/inline-keyboard';
import type { KeyboardRenderEntry } from './keyboard-render-explorer';

/** A keyboard re-render thunk: rebuilds the keyboard from the current ambient state. */
export type KeyboardRenderer = () => InlineKeyboard | Promise<InlineKeyboard>;

/**
 * The boot-time map of keyboard-group id → its `@KeyboardRender(...)` builder.
 *
 * Populated once at `OnApplicationBootstrap` via {@link set}; the built-in
 * checkbox router reads it to re-render a tapped group by re-invoking the
 * developer's builder fresh (so the whole keyboard reflects current state and
 * survives a restart), falling back to the inline-registered keyboard when no
 * builder is declared. Empty before boot, mirroring {@link UnhandledRegistry}.
 */
@Injectable()
export class KeyboardRenderRegistry {
  private readonly logger = new Logger(KeyboardRenderRegistry.name);
  private renderers = new Map<string, KeyboardRenderer>();

  // `@Optional()`: provided empty under DI and filled at boot via set(); tests can
  // construct it pre-filled.
  constructor(@Optional() entries: KeyboardRenderEntry[] = []) {
    this.set(entries);
  }

  /** Replace the contents. Called once at boot with the explored entries. */
  set(entries: KeyboardRenderEntry[]): void {
    const renderers = new Map<string, KeyboardRenderer>();
    for (const { ids, instance, methodName } of entries) {
      // Resolve the method off the instance on each call (not captured once), so a
      // method swapped after boot — an AOP/interceptor wrap — is honoured.
      const renderer: KeyboardRenderer = () =>
        (instance as Record<string, KeyboardRenderer>)[methodName].call(
          instance,
        );
      for (const id of ids) {
        if (renderers.has(id)) {
          this.logger.warn(
            `Two @KeyboardRender methods both render "${id}" — the later one wins. ` +
              'Give each group one renderer.',
          );
        }
        renderers.set(id, renderer);
      }
    }
    this.renderers = renderers;
  }

  /** The declared renderer for group `id`, or `undefined` if none. */
  get(id: string): KeyboardRenderer | undefined {
    return this.renderers.get(id);
  }
}

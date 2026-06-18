import { Injectable, Optional } from '@nestjs/common';

import { UnhandledHandler } from './unhandled-explorer';

/**
 * The boot-time set of `@OnUnhandled` handlers.
 *
 * Populated once at `OnApplicationBootstrap` via {@link set}; the dispatcher
 * reads it to run every handler when an update matched no route. Empty before
 * boot (and in unit-built dispatchers), so nothing runs until discovery fills
 * it. Mirrors {@link RouteTable}'s inject-empty-then-fill lifecycle.
 */
@Injectable()
export class UnhandledRegistry {
  private handlers: readonly UnhandledHandler[] = [];

  // `@Optional()`: provided empty under DI and filled at boot via set(); Nest
  // would otherwise try to inject the array param as a token and fail. Tests can
  // still construct it pre-filled.
  constructor(@Optional() handlers: UnhandledHandler[] = []) {
    this.handlers = [...handlers];
  }

  /** Replace the contents. Called once at boot. */
  set(handlers: UnhandledHandler[]): void {
    this.handlers = [...handlers];
  }

  /** Every discovered `@OnUnhandled` handler. */
  all(): readonly UnhandledHandler[] {
    return this.handlers;
  }
}

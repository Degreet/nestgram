import { Injectable, Optional } from '@nestjs/common';

import { Route } from './route.types';

/**
 * The boot-time route table.
 *
 * Holds the discovered routes in declaration order — first-match routing relies
 * on that order — and indexes them by update type so a per-update lookup only
 * walks the handlers that could possibly match (e.g. only `message` routes for
 * a message update), not the whole table.
 *
 * Populated once, at `OnApplicationBootstrap`, via `set()`: the same singleton
 * is injected into the dispatcher at construction (empty) and filled before any
 * update flows. Tests can also construct it pre-filled (`new RouteTable(routes)`).
 */
@Injectable()
export class RouteTable {
  private routes: readonly Route[] = [];
  private byType: ReadonlyMap<string, readonly Route[]> = new Map();

  // `@Optional()`: under DI the table is provided empty and filled at boot via
  // set(); Nest would otherwise try to inject the `Route[]` param as an `Array`
  // token and fail. Tests can still construct it pre-filled.
  constructor(@Optional() routes: Route[] = []) {
    this.set(routes);
  }

  /** Replace the table's contents and rebuild the type index. Called once at boot. */
  set(routes: Route[]): void {
    this.routes = [...routes];

    const index = new Map<string, Route[]>();
    for (const route of this.routes) {
      const bucket = index.get(route.updateType);
      if (bucket) {
        bucket.push(route);
      } else {
        index.set(route.updateType, [route]);
      }
    }
    this.byType = index;
  }

  /** All routes, in declaration order. */
  all(): readonly Route[] {
    return this.routes;
  }

  /** Routes for one update type, in declaration order (empty if none). */
  ofType(updateType: string): readonly Route[] {
    return this.byType.get(updateType) ?? [];
  }

  get size(): number {
    return this.routes.length;
  }
}

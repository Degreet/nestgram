import { Route } from './route.types';

/**
 * The immutable boot-time route table.
 *
 * Holds the discovered routes in declaration order — first-match routing relies
 * on that order — and indexes them by update type so a per-update lookup only
 * walks the handlers that could possibly match (e.g. only `message` routes for
 * a message update), not the whole table.
 */
export class RouteTable {
  private readonly routes: readonly Route[];
  private readonly byType: ReadonlyMap<string, readonly Route[]>;

  constructor(routes: Route[]) {
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

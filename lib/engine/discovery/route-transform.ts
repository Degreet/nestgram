import { Metadata } from '../../decorators/metadata.enum';
import { Route } from './route.types';

/**
 * A boot-time rewrite of the route table, applied once after {@link RouteExplorer}
 * builds it and before it is frozen into the {@link RouteTable}.
 *
 * The generic counterpart of {@link UpdateStage} for routing: where a stage
 * augments a single update, a transform augments the whole route list at boot.
 * It receives the discovered routes (declaration order) and returns the routes to
 * keep — adding predicates, reordering, dropping, whatever the feature needs.
 *
 * Engine-side this is deliberately content-agnostic: the engine never inspects
 * what a transform does, only that it runs. A feature module (e.g. scenes, which
 * ANDs an "idle" gate onto non-scene routes) drops one in by writing a provider
 * that implements this and is marked with {@link RouteTransform} — discovered
 * exactly like a stage, so no feature concept leaks into the engine.
 */
export interface RouteTransform {
  transform(routes: Route[]): Route[];
}

interface RouteTransformMetadata {
  marked: true;
}

/**
 * Marks an `@Injectable()` provider as a {@link RouteTransform}, discovered at
 * boot and applied to the route table once. Pair with `implements RouteTransform`:
 *
 * ```ts
 * @Injectable()
 * @RouteTransform()
 * export class SceneRouteGate implements RouteTransform {
 *   transform(routes: Route[]): Route[] { ... }
 * }
 * ```
 */
export const RouteTransform = (): ClassDecorator => {
  return (target) => {
    const metadata: RouteTransformMetadata = { marked: true };
    Reflect.defineMetadata(Metadata.ROUTE_TRANSFORM, metadata, target);
  };
};

/** Whether a class is marked as a `@RouteTransform`. */
export function isRouteTransform(target: object): boolean {
  return Reflect.getMetadata(Metadata.ROUTE_TRANSFORM, target) !== undefined;
}

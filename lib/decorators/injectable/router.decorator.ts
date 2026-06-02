import { SetMetadata } from '@nestjs/common';

import { Metadata } from '../metadata.enum';

/**
 * Options for `@Router()`.
 *
 * Currently empty: routers are plain Nest providers discovered from the graph,
 * so there is no `includes` (sub-routers are just providers) and no
 * `middlewares` (the parallel middleware system was removed — cross-cutting
 * concerns use Nest guards/interceptors/pipes/filters). Kept as a named type so
 * options can be added later without changing the decorator's signature.
 */
export type RouterOptions = Record<string, never>;

/**
 * Marks a class as a router (the Telegram equivalent of a controller). Routers
 * are discovered automatically; just list the class in a module's `providers`.
 */
export const Router = (options?: RouterOptions) => {
  return SetMetadata(Metadata.ROUTER, options ?? {});
};

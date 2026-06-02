import { SetMetadata } from '@nestjs/common';

import { Metadata } from '../metadata.enum';

/**
 * Options for `@Router()`. Empty for now — routers are plain Nest providers,
 * so cross-cutting concerns use Nest guards/interceptors/pipes/filters. Named
 * as a type so options can be added without changing the decorator's signature.
 */
export type RouterOptions = Record<string, never>;

/**
 * Marks a class as a router (the Telegram equivalent of a controller). Routers
 * are discovered automatically; just list the class in a module's `providers`.
 */
export const Router = (options?: RouterOptions) => {
  return SetMetadata(Metadata.ROUTER, options ?? {});
};

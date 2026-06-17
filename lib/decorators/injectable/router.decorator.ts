import { SetMetadata } from '@nestjs/common';

import { Metadata } from '../metadata.enum';

/** Options for `@Router()`. Routers are plain Nest providers, so cross-cutting
 * concerns use Nest guards/interceptors/pipes/filters — not options here. */
export interface RouterOptions {
  /**
   * Namespaces this router's callback routes: with `@Router('reminder')`, a
   * handler's `@Action('done/:id')` matches `reminder/done/:id` on the wire.
   * Only the path-template form of `@Action` is prefixed; a regex or a custom
   * `RoutePredicate` manages its own data unchanged.
   */
  prefix?: string;
}

/**
 * Marks a class as a router (the Telegram equivalent of a controller). Routers
 * are discovered automatically; just list the class in a module's `providers`.
 * Pass a string (or `{ prefix }`) to namespace its callback routes.
 */
export const Router = (prefixOrOptions?: string | RouterOptions) => {
  const options: RouterOptions =
    typeof prefixOrOptions === 'string'
      ? { prefix: prefixOrOptions }
      : prefixOrOptions ?? {};
  return SetMetadata(Metadata.ROUTER, options);
};

/** The router prefix declared on a class, or `undefined`. Reads {@link Metadata.ROUTER}. */
export const getRouterPrefix = (target: object): string | undefined => {
  const options: RouterOptions | undefined = Reflect.getMetadata(
    Metadata.ROUTER,
    target,
  );
  return options?.prefix;
};

import { NestgramFilter } from '../types';

/**
 * A single resolved route in the boot-time route table: a router method bound
 * to one listener decorator. A method may carry several listeners, each
 * producing its own route. Built once at startup, never per update.
 */
export interface Route {
  /** The Telegram update type this handler listens to (e.g. `'message'`). */
  readonly updateType: string;
  /** Per-listener filters declared on the decorator. */
  readonly filters: NestgramFilter[];
  /** The router instance that owns the handler. */
  readonly instance: object;
  /** The handler method name on that instance. */
  readonly methodName: string;
}

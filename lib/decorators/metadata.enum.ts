/** Reflect-metadata keys the framework's decorators write and discovery reads. */
export enum Metadata {
  LISTENERS = 'LISTENERS',
  ROUTER = 'ROUTER',
  NO_AUTO_ANSWER = 'NO_AUTO_ANSWER',
  UPDATE_STAGE = 'UPDATE_STAGE',
  /**
   * Match predicates ANDed into routes — method-level (`@Match`, `@AnyState`) on
   * the method, or class-level (`@ForBot` on a router) on the constructor.
   */
  MATCH = 'MATCH',
}

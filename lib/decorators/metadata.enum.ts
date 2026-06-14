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
  /** The scene id a `@Scene('id')` class declares (on the constructor). */
  SCENE = 'SCENE',
  /** Marks a method as a `@Step()` of a scene, carrying its options. */
  SCENE_STEP = 'SCENE_STEP',
  /** Marks a method as a scene-lifecycle hook (`@OnEnter`/`@OnLeave`). */
  SCENE_LIFECYCLE = 'SCENE_LIFECYCLE',
}

/** Reflect-metadata keys the framework's decorators write and discovery reads. */
export enum Metadata {
  LISTENERS = 'LISTENERS',
  ROUTER = 'ROUTER',
  NO_AUTO_ANSWER = 'NO_AUTO_ANSWER',
  UPDATE_STAGE = 'UPDATE_STAGE',
  /** Method-level match predicates merged into every route of the method (`@Match`). */
  MATCH = 'MATCH',
}

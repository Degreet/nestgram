import { applyDecorators, SetMetadata } from '@nestjs/common';

import { Metadata } from '../decorators/metadata.enum';

/**
 * Marks a class as a scene (a wizard / multi-step dialog). A scene is a router
 * specialization: it is discovered by the same `DiscoveryService` pass as
 * `@Router()`, so its `@Step()` handlers join the route table, while the scene
 * id gates them to the active scene.
 *
 * Stamps BOTH `Metadata.ROUTER` (so the route explorer picks the class up) and
 * `Metadata.SCENE` (the id the scene registry resolves a {@link SceneClass} to).
 * List the class in a module's `providers`, like any router.
 *
 * ```ts
 * @Scene('registration')
 * export class RegistrationScene {
 *   @OnEnter() start() { return 'What is your name?'; }
 *   @Step() @OnText() name(message: Message, @SceneCtx() scene: SceneContext) { ... }
 * }
 * ```
 */
export const Scene = (id: string): ClassDecorator => {
  return applyDecorators(
    SetMetadata(Metadata.ROUTER, {}),
    SetMetadata(Metadata.SCENE, id),
  );
};

/** The scene id a `@Scene('id')` class declares, or `undefined` if it is not a scene. */
export function sceneIdOf(target: object): string | undefined {
  return Reflect.getMetadata(Metadata.SCENE, target);
}

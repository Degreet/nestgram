import { createParamDecorator } from '@nestjs/common';

import { currentSceneContext } from '../../scenes/scene.context';

/**
 * Injects the per-update {@link SceneContext} — the scene navigation + data API
 * (loaded by the scene stage before the handler runs, when `ScenesModule` is
 * imported):
 *
 * ```ts
 * @Step() @OnText()
 * name(message: Message, @SceneCtx() scene: SceneContext<RegData>) {
 *   await scene.update({ name: message.text });
 *   return scene.next('How old are you?');
 * }
 * ```
 *
 * Type the data via the annotation — `@SceneCtx() scene: SceneContext<RegData>` —
 * a param decorator cannot set the parameter's type from its argument. This
 * injected context is the ONLY way to drive a scene: there is no public `scene()`
 * free function (a flow-mutating API behind ambient magic is intentionally not
 * exposed).
 */
export const SceneCtx = createParamDecorator((_data: unknown) =>
  currentSceneContext(),
);

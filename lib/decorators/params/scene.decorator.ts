import { createParamDecorator } from '@nestjs/common';

import { scene } from '../../scenes/scene.context';

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
 * a param decorator cannot set the parameter's type from its argument. The same
 * context is reachable as the `scene()` free function in services/guards.
 */
export const SceneCtx = createParamDecorator((_data: unknown) => scene());

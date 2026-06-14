import { Match } from '../decorators/match.decorator';
import { inScene, noScene } from './scene-filter.predicates';

/**
 * Narrows a handler to fire ONLY while a scene is active (any scene). A
 * method-level modifier (built on `@Match`) — it ANDs into every route the method
 * declares, so it composes with `@Command`/`@OnMessage`/… regardless of order:
 *
 * ```ts
 * @Command('cancel')
 * @InScene()
 * cancel(message: Message, @SceneCtx() scene: SceneContext) { return scene.leave('Cancelled.'); }
 * ```
 */
export const InScene = (): MethodDecorator => Match(inScene);

/**
 * Narrows a handler to fire ONLY while NO scene is active (idle) — e.g. a
 * catch-all that must not steal a scene step's input. The scene counterpart of
 * `@NoState()`; same composition rules as {@link InScene}.
 */
export const NoScene = (): MethodDecorator => Match(noScene);

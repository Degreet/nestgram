import { Match } from '../decorators/match.decorator';
import { inSceneMarker } from './scene-filter.predicates';

/**
 * Opts a handler OUT of scene input-capture. By default an active scene captures
 * input — while it runs, only its `@Step()` routes match and every other handler
 * is suppressed. `@InScene()` marks a handler as exempt, so it keeps firing BOTH
 * while idle AND while any scene is active (its own `@Command`/`@OnMessage`/…
 * filters still apply). The canonical use is a cross-cutting in-scene control like
 * a global `/cancel`:
 *
 * ```ts
 * @Command('cancel')
 * @InScene()
 * cancel(message: Message, @SceneCtx() scene: SceneContext) { return scene.leave('Cancelled.'); }
 * ```
 *
 * It is an additive marker, not a "only while a scene is active" predicate — it
 * never narrows when the handler runs, it only exempts it from suppression. Built
 * on the public `@Match` primitive: the marker is a no-op predicate the boot-time
 * scene gate recognises by identity.
 */
export const InScene = (): MethodDecorator => Match(inSceneMarker);

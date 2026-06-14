import { getAmbient } from '../ambient';
import { SCENES } from './scenes.constants';
import type { SceneSnapshot } from './scenes.types';

/** The current update's loaded scene snapshot, or `undefined` when scenes are off. */
export function currentSnapshot(): SceneSnapshot | undefined {
  return getAmbient<SceneSnapshot>(SCENES);
}

/**
 * The active scene id, or `null` when no scene is running (or scenes are off).
 * The single ambient read shared by the step predicate and {@link SceneContext}.
 */
export function activeSceneId(): string | null {
  return currentSnapshot()?.active ?? null;
}

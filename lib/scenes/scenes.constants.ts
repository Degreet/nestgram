/** Ambient-store key under which the loaded scene snapshot lives. */
export const SCENES = Symbol('nestgram:scenes');

/**
 * Ambient-store key for the resolved key + store + runner of the current scene
 * record, so {@link SceneContext} can drive transitions without recomputing.
 */
export const SCENES_BINDING = Symbol('nestgram:scenes-binding');

/**
 * Key prefix for scene records, so they never collide with sessions or FSM when
 * the three share one store instance (`scenes:` + the conversation key).
 */
export const SCENES_NAMESPACE = 'scenes:';

/** The first step's ordinal — a scene always enters at its first declared step. */
export const FIRST_STEP = 0;

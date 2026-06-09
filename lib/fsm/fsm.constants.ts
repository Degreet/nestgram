/** Ambient-store key under which the loaded FSM snapshot (`{ state, data }`) lives. */
export const FSM = Symbol('nestgram:fsm');

/**
 * Ambient-store key for the resolved key + store of the current FSM record, so
 * `FsmContext` can write transitions through without recomputing.
 */
export const FSM_BINDING = Symbol('nestgram:fsm-binding');

/**
 * Key prefix for FSM records, so they never collide with sessions when the two
 * share one store instance (`fsm:` + the conversation key).
 */
export const FSM_NAMESPACE = 'fsm:';

/** Separator between a state group name and a state name (`reg` + `name` → `reg:name`). */
export const STATE_KEY_SEPARATOR = ':';

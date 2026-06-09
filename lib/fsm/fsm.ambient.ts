import { getAmbient } from '../ambient';
import { FSM } from './fsm.constants';
import type { FsmSnapshot } from './fsm.types';

/** The current update's loaded FSM snapshot, or `undefined` when FSM is off. */
export function currentSnapshot(): FsmSnapshot | undefined {
  return getAmbient<FsmSnapshot>(FSM);
}

/**
 * The current FSM state id, or `null` when no flow is active (or FSM is off).
 * The single ambient read shared by `State`/`anyState`/`noState` predicates and
 * `FsmContext`.
 */
export function currentStateId(): string | null {
  return currentSnapshot()?.state ?? null;
}

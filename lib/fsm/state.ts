// `import type`: a type-only edge on `matching` keeps `fsm` free of a runtime
// import cycle (matching → context → … ), the same discipline the predicates use.
import type { RoutePredicate } from '../engine/matching';
import { currentStateId } from './fsm.ambient';
import { STATE_KEY_SEPARATOR } from './fsm.constants';

/**
 * A single FSM state. It is BOTH an identity — `fsm.set(Reg.name)` — AND a
 * {@link RoutePredicate} — `@OnMessage(Reg.name)` matches only while this state
 * is active (aiogram's `@router.message(Form.field)`). The predicate reads the
 * ambient state the FSM stage loaded before matching, so it ANDs with the
 * listener's update type.
 *
 * Named `FsmState` (not `State`) to avoid colliding with the `@State()` param
 * decorator — and to sit beside `FsmContext`/`FsmModule`. You rarely name the
 * type directly; you use the members a `stateGroup` returns (`Reg.name`).
 */
export class FsmState implements RoutePredicate {
  /** The stored state id, `group:name` (e.g. `reg:name`). */
  readonly id: string;

  constructor(group: string, name: string) {
    this.id = `${group}${STATE_KEY_SEPARATOR}${name}`;
  }

  matches(): boolean {
    return currentStateId() === this.id;
  }
}

/** A named set of states: `Reg.name`, `Reg.age`, each an {@link FsmState}. */
export type StateGroup<Name extends string> = Readonly<Record<Name, FsmState>>;

/**
 * Define a group of FSM states (aiogram's `StatesGroup`), as a factory rather
 * than a class — symmetric with `callbackData()` and friendlier to infer in TS:
 *
 * ```ts
 * const Reg = stateGroup('reg', ['name', 'age']); // Reg.name.id === 'reg:name'
 * ```
 *
 * Each member is an {@link FsmState} — pass it inline to a listener
 * (`@OnMessage(Reg.name)`) to route on it, or to `fsm.set(Reg.name)` to enter it.
 */
export function stateGroup<const Name extends string>(
  group: string,
  names: readonly Name[],
): StateGroup<Name> {
  const states = {} as Record<Name, FsmState>;
  for (const name of names) {
    states[name] = new FsmState(group, name);
  }
  return Object.freeze(states);
}

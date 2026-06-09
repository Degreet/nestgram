import { getAmbient } from '../ambient';
import { NestgramError } from '../exceptions';
import { currentSnapshot } from './fsm.ambient';
import { FSM_BINDING } from './fsm.constants';
import { FsmState } from './state';
import type { FsmBinding, FsmSnapshot } from './fsm.types';

/**
 * The handler-facing FSM API (aiogram's `FSMContext`), reachable via `@Fsm()` or
 * the `fsm()` free function. Reads degrade gracefully when FSM is off or the
 * update has no chat (`current()` → null, `data()` → `{}`); a transition then
 * throws, because a silently dropped `set`/`update` is a debugging trap.
 *
 * Transitions are **write-through** to the store (aiogram parity), not deferred
 * to a commit — so a state change survives a later send failure in the handler.
 *
 * Type the data once via the annotation — `@Fsm() fsm: FsmContext<RegData>` — and
 * `data()`/`update()`/`setData()` are checked against it. `data()` is `Partial`
 * because a flow fills its fields step by step.
 */
export class FsmContext<TData = Record<string, unknown>> {
  /** The current state id (`group:name`), or `null` when no flow is active. */
  current(): string | null {
    return currentSnapshot()?.state ?? null;
  }

  /** The data gathered so far — partial, since a flow fills it step by step. */
  data(): Partial<TData> {
    return (currentSnapshot()?.data ?? {}) as Partial<TData>;
  }

  /** Enter a state. `fsm.set(Reg.age)`. */
  async set(state: FsmState): Promise<void> {
    const snapshot = this.require();
    snapshot.state = state.id;
    await this.persist(snapshot);
  }

  /** Merge a patch into the flow data. `fsm.update({ name })`. */
  async update(patch: Partial<TData>): Promise<void> {
    const snapshot = this.require();
    Object.assign(snapshot.data, patch);
    await this.persist(snapshot);
  }

  /** Replace the flow data wholesale. */
  async setData(data: TData): Promise<void> {
    const snapshot = this.require();
    snapshot.data = data as Record<string, unknown>;
    await this.persist(snapshot);
  }

  /** Finish the flow: drop the state and its data. */
  async clear(): Promise<void> {
    const snapshot = this.require();
    snapshot.state = null;
    snapshot.data = {};
    const binding = this.binding();
    // `binding` is guaranteed by `require()` above; the delete clears the record
    // rather than persisting an empty one, so an idle conversation stores nothing.
    if (binding) {
      await binding.store.delete(binding.key);
    }
  }

  private binding(): FsmBinding | undefined {
    return getAmbient<FsmBinding>(FSM_BINDING);
  }

  private require(): FsmSnapshot {
    const snapshot = currentSnapshot();
    if (!snapshot || !this.binding()) {
      throw new NestgramError(
        'FSM is not available for this update — is FsmModule imported, and ' +
          'does the update have a chat to scope to?',
      );
    }
    return snapshot;
  }

  private async persist(snapshot: FsmSnapshot): Promise<void> {
    const binding = this.binding();
    if (binding) {
      await binding.store.set(binding.key, snapshot);
    }
  }
}

// The context is stateless — it reads the ambient store on every call — so a
// single shared instance serves every handler; the generic is a type-only view.
const sharedContext = new FsmContext();

/**
 * The current update's FSM context — a free function, reachable anywhere in the
 * update's call chain (services, guards), the same ambient bargain as `t()`.
 * `@Fsm()` is sugar over this for handler params.
 */
export function fsm<TData = Record<string, unknown>>(): FsmContext<TData> {
  return sharedContext as FsmContext<TData>;
}

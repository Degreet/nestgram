import type { TelegramExecutionContext } from '../engine/context';
import type { KeyValueStore } from '../store';

/**
 * The persisted per-conversation FSM record: the current state plus the data
 * accumulated across the flow's steps.
 */
export interface FsmSnapshot {
  /** The current state id (`group:name`), or `null` when no flow is active. */
  state: string | null;
  /** Data gathered so far in the flow — typed via `FsmContext<TData>`. */
  data: Record<string, unknown>;
}

/** The resolved key + store of the current update's FSM record (ambient). */
export interface FsmBinding {
  key: string;
  store: KeyValueStore;
}

/**
 * FSM configuration, passed to `FsmModule.forRoot`. The store and key are
 * swappable — no privileged core. Separate from sessions on purpose: FSM works
 * without sessions; point both at one store instance to share persistence.
 */
export interface FsmOptions {
  /** Persistence. Default: a process-local {@link MemoryStore}. */
  store?: KeyValueStore;
  /**
   * Compute the FSM key for an update. Default `defaultConversationKey`
   * (chat · user · forum topic · business connection). Return `undefined` to
   * skip FSM for this update.
   */
  key?: (ctx: TelegramExecutionContext) => string | undefined;
}

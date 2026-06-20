import type { KeyValueStore } from '../../store/key-value-store';

/**
 * The per-message keyboard state — a small bag of interaction state (checkbox
 * selections; page cursors and linking keys later). The dataset itself is NOT
 * stored: the keyboard re-derives it from your source each render, so this stays
 * tiny. Keyed per message, namespaced inside the bag (`checkbox:<id>`, …).
 */
export type KeyboardState = Record<string, unknown>;

/**
 * Configures the store behind per-message keyboard state. Entirely optional — the
 * feature is auto-wired with sensible defaults; pass this only to override.
 *
 * Resolution order when unset: an explicit `store` here → the session store's
 * backend (so a Redis session setup makes keyboards highload-safe for free) → an
 * in-process memory store (single-instance / dev). On highload behind several
 * servers the in-memory default loses state across instances, so back it with a
 * shared store there.
 */
export interface KeyboardStateOptions {
  /** A custom {@link KeyValueStore} for keyboard state (e.g. a shared Redis). */
  store?: KeyValueStore;
}

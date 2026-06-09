// A session store is just a key-value store — the session-facing name for the
// shared {@link KeyValueStore} seam (also backing FSM). Kept as an alias so the
// public `SessionStore` vocabulary, and existing imports, stay stable.
export type { KeyValueStore as SessionStore } from '../store/key-value-store';

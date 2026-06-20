/** Ambient-store key under which the current message's keyboard state lives. */
export const KEYBOARD_STATE = Symbol('nestgram:keyboard-state');

/**
 * Ambient-store key for the resolved key + store of the current keyboard state,
 * so {@link KeyboardStateService.save} can persist without recomputing.
 */
export const KEYBOARD_STATE_BINDING = Symbol('nestgram:keyboard-state-binding');

/**
 * Namespace prefix on every keyboard-state key. Keeps per-message keyboard state
 * in its own keyspace even when it shares a backend with sessions (the highload
 * default), so a `kbd:…` key can never collide with a session's conversation key.
 */
export const KEYBOARD_STATE_KEY_NS = 'kbd';

/**
 * Default lifetime of a message's keyboard state in the in-memory fallback store
 * (one hour, sliding — re-saved on each interaction). A live keyboard is edited
 * for a bounded session, not forever; an abandoned one should not leak. Override
 * with a durable store (Redis, or the shared session store) for longer-lived UIs.
 */
export const DEFAULT_KEYBOARD_STATE_TTL_MS = 60 * 60 * 1000;

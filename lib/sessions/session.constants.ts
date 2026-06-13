/** Ambient-store key under which the loaded session object lives. */
export const SESSION = Symbol('nestgram:session');

/**
 * Ambient-store key for the resolved key + store of the current session, so
 * `SessionService.save()` can persist without recomputing.
 */
export const SESSION_BINDING = Symbol('nestgram:session-binding');

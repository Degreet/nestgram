import type { TelegramExecutionContext } from '../engine/context';
import type { SessionStore } from './session-store';

/**
 * Session configuration, passed as `session` on the module options. Presence
 * enables sessions; omit it to keep them off (then `@Session()` resolves to
 * `undefined`). The store and key are swappable — no privileged core.
 */
export interface SessionOptions {
  /** Persistence. Default: a process-local {@link MemorySessionStore}. */
  store?: SessionStore;
  /**
   * Compute the session key for an update. Default {@link defaultSessionKey}
   * (chat · user · forum topic · business connection). Return `undefined` to
   * skip a session for this update.
   */
  key?: (ctx: TelegramExecutionContext) => string | undefined;
  /** Initial value when no session exists yet. Default: `() => ({})`. */
  defaults?: () => unknown;
}

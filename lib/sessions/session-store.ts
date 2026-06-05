/**
 * Persistence behind a session. `get`/`set`/`delete` may be sync or async — the
 * engine awaits them either way. `get` resolves to the stored value, or
 * `undefined` when there is none. The framework ships `MemorySessionStore` and
 * `RedisSessionStore`; any object satisfying this interface plugs in.
 */
export interface SessionStore {
  get(key: string): Promise<unknown> | unknown;
  set(key: string, value: unknown): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

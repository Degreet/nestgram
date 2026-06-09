/**
 * Persistence behind a per-conversation facility (sessions, FSM state). `get`/
 * `set`/`delete` may be sync or async — the engine awaits them either way. `get`
 * resolves to the stored value, or `undefined` when there is none. The framework
 * ships {@link MemoryStore} and a Redis-backed store; any object satisfying this
 * interface plugs in.
 */
export interface KeyValueStore {
  get(key: string): Promise<unknown> | unknown;
  set(key: string, value: unknown): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

interface Entry {
  value: unknown;
  expiresAt?: number;
}

/**
 * In-process key-value store — the default for sessions and FSM. Optional TTL
 * (milliseconds) is a sliding expiry, since the engine re-saves on each update.
 * Process-local, so it is fine for single-instance deployments and development;
 * reach for a Redis-backed store when running multiple instances.
 *
 * Note: it stores the live object reference (no copy), so a handler's in-place
 * mutations are visible immediately, even before a save runs — the engine's
 * save-on-success-only guarantee therefore won't roll back a handler that
 * mutated and then threw. A Redis store's JSON round-trip does isolate a fresh
 * copy per load. Don't rely on rollback-on-throw with the memory store.
 */
export class MemoryStore implements KeyValueStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly ttlMs?: number) {}

  get(key: string): unknown {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: unknown): void {
    this.entries.set(key, {
      value,
      expiresAt: this.ttlMs !== undefined ? Date.now() + this.ttlMs : undefined,
    });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}

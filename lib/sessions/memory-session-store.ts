import { SessionStore } from './session-store';

interface Entry {
  value: unknown;
  expiresAt?: number;
}

/**
 * In-process session store — the default. Optional TTL (milliseconds) is a
 * sliding expiry, since the engine re-saves on each update. Process-local, so
 * it is fine for single-instance deployments and development; reach for
 * `RedisSessionStore` when running multiple instances.
 *
 * Note: it stores the live object reference (no copy), so a handler's in-place
 * mutations are visible immediately, even before `save` runs — the engine's
 * save-on-success-only guarantee therefore won't roll back a handler that
 * mutated and then threw. RedisSessionStore's JSON round-trip does isolate a
 * fresh copy per load. Don't rely on rollback-on-throw with the memory store.
 */
export class MemorySessionStore implements SessionStore {
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

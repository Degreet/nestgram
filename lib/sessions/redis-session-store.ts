import { SessionStore } from './session-store';

/**
 * The minimal slice of a Redis client this store needs. Passing the client
 * (rather than depending on a redis library) keeps the framework
 * dependency-free. This shape matches **ioredis** directly. node-redis (v4)
 * differs — its TTL is `set(key, value, { EX: seconds })` and `get` can return a
 * Buffer — so a node-redis user wraps their client in a small adapter exposing
 * exactly these methods.
 */
export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    seconds: number,
  ): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface RedisSessionStoreOptions {
  /** Key prefix, so sessions don't collide with other data. Default `nestgram:session:`. */
  prefix?: string;
  /** Expiry in seconds — sliding, re-applied on each save. */
  ttlSeconds?: number;
}

/**
 * Redis-backed session store: JSON-serialises values under a prefixed key.
 * You provide the client, so the framework stays dependency-free.
 */
export class RedisSessionStore implements SessionStore {
  private readonly prefix: string;
  private readonly ttlSeconds?: number;

  constructor(
    private readonly client: RedisLikeClient,
    options: RedisSessionStoreOptions = {},
  ) {
    this.prefix = options.prefix ?? 'nestgram:session:';
    this.ttlSeconds = options.ttlSeconds;
  }

  async get(key: string): Promise<unknown> {
    const raw = await this.client.get(this.prefix + key);
    if (raw === null) {
      return undefined;
    }
    try {
      return JSON.parse(raw);
    } catch {
      // A corrupt / legacy value isn't a session — treat it as none rather than
      // failing the whole update on a JSON error.
      return undefined;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    if (this.ttlSeconds !== undefined) {
      await this.client.set(
        this.prefix + key,
        serialized,
        'EX',
        this.ttlSeconds,
      );
    } else {
      await this.client.set(this.prefix + key, serialized);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.prefix + key);
  }
}

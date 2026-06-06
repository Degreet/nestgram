import { ChatLimiterRegistry } from './chat-limiter-registry';
import { FakeClock } from './clock.fake';
import { ResolvedThrottleOptions, THROTTLE_DEFAULTS } from './throttle.types';

const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

function opts(
  over: Partial<ResolvedThrottleOptions> = {},
): ResolvedThrottleOptions {
  return { ...THROTTLE_DEFAULTS, ...over };
}

describe('ChatLimiterRegistry', () => {
  it('creates one limiter per chat, lazily', async () => {
    const registry = new ChatLimiterRegistry(opts(), new FakeClock());
    await registry.acquire(1);
    await registry.acquire(2);
    expect(registry.size).toBe(2);
  });

  it('reuses the same limiter and enforces the per-chat gap', async () => {
    const clock = new FakeClock();
    const registry = new ChatLimiterRegistry(
      opts({ perChatIntervalMs: 1000 }),
      clock,
    );
    await registry.acquire(1);

    let resolved = false;
    const second = registry.acquire(1).then(() => {
      resolved = true;
    });
    await flush();
    expect(resolved).toBe(false); // same limiter, gap not elapsed

    await clock.advance(1000);
    await second;
    expect(resolved).toBe(true);
    expect(registry.size).toBe(1);
  });

  it('sweeps entries idle past idleTtlMs', async () => {
    const clock = new FakeClock();
    const registry = new ChatLimiterRegistry(opts({ idleTtlMs: 1000 }), clock);
    await registry.acquire(1);
    await registry.acquire(2);
    expect(registry.size).toBe(2);

    await clock.advance(1500);
    registry.sweep();
    expect(registry.size).toBe(0);
  });

  it('keeps a recently-used entry across a sweep', async () => {
    const clock = new FakeClock();
    const registry = new ChatLimiterRegistry(opts({ idleTtlMs: 1000 }), clock);
    await registry.acquire(1);
    await clock.advance(1500);
    await registry.acquire(2); // fresh; 1 is now stale
    registry.sweep();
    expect(registry.size).toBe(1);
  });

  it('never exceeds maxKeys (LRU backstop)', async () => {
    const registry = new ChatLimiterRegistry(
      opts({ maxKeys: 3 }),
      new FakeClock(),
    );
    for (let id = 1; id <= 10; id += 1) {
      await registry.acquire(id);
    }
    expect(registry.size).toBe(3);
  });
});

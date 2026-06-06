import { FakeClock } from './clock.fake';
import { MinInterval, TokenBucket } from './limiters';

const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

describe('TokenBucket', () => {
  it('allows a burst up to capacity, then blocks until refill', async () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(3, 3, 1000, clock);

    await bucket.acquire();
    await bucket.acquire();
    await bucket.acquire(); // 3 tokens spent

    let resolved = false;
    const fourth = bucket.acquire().then(() => {
      resolved = true;
    });
    await flush();
    expect(resolved).toBe(false);

    await clock.advance(1000); // refills
    await fourth;
    expect(resolved).toBe(true);
  });

  it('aborting a parked acquire rejects without consuming a slot', async () => {
    const clock = new FakeClock();
    const bucket = new TokenBucket(1, 1, 1000, clock);
    await bucket.acquire(); // empty

    const controller = new AbortController();
    const parked = bucket.acquire(controller.signal);
    await flush();
    controller.abort();
    await expect(parked).rejects.toMatchObject({ name: 'AbortError' });

    await clock.advance(1000);
    await expect(bucket.acquire()).resolves.toBeUndefined();
  });
});

describe('MinInterval', () => {
  it('enforces a minimum gap between acquires', async () => {
    const clock = new FakeClock();
    const gate = new MinInterval(1000, clock);
    await gate.acquire(); // immediate

    let resolved = false;
    const second = gate.acquire().then(() => {
      resolved = true;
    });
    await flush();
    expect(resolved).toBe(false);

    await clock.advance(999);
    await flush();
    expect(resolved).toBe(false);

    await clock.advance(1);
    await second;
    expect(resolved).toBe(true);
  });
});

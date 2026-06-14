import { FakeClock } from '../builtins/throttle/clock.fake';
import { MemoryStore } from '../store/key-value-store';
import { RateLimiter } from './rate-limiter';

const LIMIT = 3;
const WINDOW_MS = 1_000;
const KEY = 'c1:u7';

function build(): { limiter: RateLimiter; clock: FakeClock } {
  const clock = new FakeClock();
  const limiter = new RateLimiter(new MemoryStore(), clock);
  return { limiter, clock };
}

describe('RateLimiter (sliding window)', () => {
  it('allows up to the limit, then denies within the window', async () => {
    const { limiter } = build();

    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(true);
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(true);
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(true);
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(false);
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(false);
  });

  it('allows again once the window slides past the oldest hit', async () => {
    const { limiter, clock } = build();

    await limiter.hit(KEY, LIMIT, WINDOW_MS); // t=0
    await limiter.hit(KEY, LIMIT, WINDOW_MS); // t=0
    await limiter.hit(KEY, LIMIT, WINDOW_MS); // t=0
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(false);

    // Slide past the three t=0 hits — all now older than the window.
    await clock.advance(WINDOW_MS + 1);
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(true);
  });

  it('is a true sliding window — frees one slot at a time, no boundary burst', async () => {
    const { limiter, clock } = build();

    await limiter.hit(KEY, LIMIT, WINDOW_MS); // t=0
    await clock.advance(400);
    await limiter.hit(KEY, LIMIT, WINDOW_MS); // t=400
    await clock.advance(400);
    await limiter.hit(KEY, LIMIT, WINDOW_MS); // t=800 -> at limit
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(false);

    // At t=1001 only the t=0 hit has expired -> exactly one slot frees.
    await clock.advance(201); // now t=1001
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(true); // fills the freed slot
    expect(await limiter.hit(KEY, LIMIT, WINDOW_MS)).toBe(false); // t=400/800/1001 full
  });

  it('scopes counters by key', async () => {
    const { limiter } = build();

    await limiter.hit('a', 1, WINDOW_MS);
    expect(await limiter.hit('a', 1, WINDOW_MS)).toBe(false);
    expect(await limiter.hit('b', 1, WINDOW_MS)).toBe(true);
  });

  it('does not advance the window on a denied hit', async () => {
    const { limiter, clock } = build();

    await limiter.hit(KEY, 1, WINDOW_MS); // t=0, fills the single slot
    await clock.advance(600);
    expect(await limiter.hit(KEY, 1, WINDOW_MS)).toBe(false); // t=600 denied, not recorded

    // The slot frees WINDOW_MS after the t=0 hit, not after the denied t=600 one.
    await clock.advance(401); // now t=1001 > 0 + WINDOW_MS
    expect(await limiter.hit(KEY, 1, WINDOW_MS)).toBe(true);
  });
});

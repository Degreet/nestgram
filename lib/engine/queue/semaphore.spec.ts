import { Semaphore } from './semaphore';

const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

describe('Semaphore', () => {
  it('rejects a permit count below 1', () => {
    expect(() => new Semaphore(0)).toThrow(RangeError);
    expect(() => new Semaphore(-1)).toThrow(RangeError);
  });

  it('hands out permits immediately while available', async () => {
    const sem = new Semaphore(2);
    expect(sem.free).toBe(2);

    await sem.acquire();
    await sem.acquire();

    expect(sem.free).toBe(0);
    expect(sem.waiting).toBe(0);
  });

  it('makes a caller wait once permits run out, resolving on release', async () => {
    const sem = new Semaphore(1);
    const release = await sem.acquire();

    let acquired = false;
    const pending = sem.acquire().then(() => {
      acquired = true;
    });

    await flush();
    expect(acquired).toBe(false);
    expect(sem.waiting).toBe(1);

    release();
    await pending;
    expect(acquired).toBe(true);
  });

  it('serves waiters in FIFO order', async () => {
    const sem = new Semaphore(1);
    const first = await sem.acquire();

    const order: number[] = [];
    const a = sem.acquire().then((r) => {
      order.push(1);
      return r;
    });
    const b = sem.acquire().then((r) => {
      order.push(2);
      return r;
    });

    first();
    const releaseA = await a;
    releaseA();
    await b;

    expect(order).toEqual([1, 2]);
  });

  it('hands a released permit straight to the next waiter (no counter bounce)', async () => {
    const sem = new Semaphore(1);
    const release = await sem.acquire();

    const pending = sem.acquire();
    release();
    await pending;

    // The waiter took the permit directly, so none returned to the pool.
    expect(sem.free).toBe(0);
  });

  it('ignores a double release (no permit leak)', async () => {
    const sem = new Semaphore(1);
    const release = await sem.acquire();

    release();
    release();

    expect(sem.free).toBe(1);
  });
});

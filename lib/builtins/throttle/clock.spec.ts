import { SystemClock } from './clock';

describe('SystemClock', () => {
  it('resolves after the given duration', async () => {
    jest.useFakeTimers();
    try {
      let done = false;
      const promise = new SystemClock().sleep(1000).then(() => {
        done = true;
      });
      jest.advanceTimersByTime(999);
      await Promise.resolve();
      expect(done).toBe(false);
      jest.advanceTimersByTime(1);
      await promise;
      expect(done).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('rejects immediately on an already-aborted signal', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new SystemClock().sleep(1000, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('rejects when aborted mid-sleep', async () => {
    jest.useFakeTimers();
    try {
      const controller = new AbortController();
      const promise = new SystemClock().sleep(1000, controller.signal);
      controller.abort();
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    } finally {
      jest.useRealTimers();
    }
  });
});

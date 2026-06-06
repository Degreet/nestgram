import { NoopThrottler } from './noop-throttler';

describe('NoopThrottler', () => {
  it('runs the send immediately and forwards the result', async () => {
    const throttler = new NoopThrottler();
    await expect(
      throttler.run(1, undefined, () => Promise.resolve('x')),
    ).resolves.toBe('x');
  });

  it('forwards a thrown error untouched', async () => {
    const throttler = new NoopThrottler();
    await expect(
      throttler.run(1, undefined, () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
  });
});

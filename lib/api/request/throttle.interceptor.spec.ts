import { lastValueFrom, of } from 'rxjs';

import { ApiError } from '../api-response';
import { ApiException } from '../../exceptions/api.exception';
import { FakeClock } from './clock.fake';
import { ThrottleInterceptor } from './throttle.interceptor';
import { ApiCallHandler, ApiExecutionContext } from './api-interceptor.types';
import { ApiRequest } from './request.types';

const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

function rateLimit(
  retryAfter?: number,
  scope?: 'chat' | 'global',
): ApiException {
  return new ApiException(
    {
      ok: false,
      error_code: 429,
      description: 'Too Many Requests',
      parameters: { retry_after: retryAfter, scope },
    } as ApiError,
    {},
  );
}

/** Build a context whose method advertises `throttled` and whose payload carries a chat id. */
function context(
  method: string,
  payload: Record<string, unknown>,
  throttled?: boolean,
): ApiExecutionContext {
  const request: ApiRequest = { method, payload, token: 'T' };
  return {
    getRequest: () => request,
    getMethod: () => ({ method, throttled }),
    getSignal: () => undefined,
    getType: () => 'telegram:api',
  };
}

describe('ThrottleInterceptor — gate + retry (run)', () => {
  it('runs the send when slots are free', async () => {
    const throttler = new ThrottleInterceptor({}, new FakeClock());
    await expect(
      throttler.run(123, undefined, () => Promise.resolve('ok')),
    ).resolves.toBe('ok');
  });

  it('takes the global-only path for a chatless send', async () => {
    const throttler = new ThrottleInterceptor({}, new FakeClock());
    await expect(
      throttler.run(undefined, undefined, () => Promise.resolve('me')),
    ).resolves.toBe('me');
  });

  it('retries a 429 after waiting retry_after + buffer, then succeeds', async () => {
    const clock = new FakeClock();
    const throttler = new ThrottleInterceptor(
      { throttle: { retryBufferMs: 250 } },
      clock,
    );
    const send = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(rateLimit(2))
      .mockResolvedValueOnce('ok');

    const promise = throttler.run(123, undefined, send);
    await flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(clock.pending).toBe(1); // parked on retry_after

    await clock.advance(2 * 1000 + 250);
    await expect(promise).resolves.toBe('ok');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('rethrows after exhausting maxRetries', async () => {
    const clock = new FakeClock();
    const throttler = new ThrottleInterceptor(
      { throttle: { maxRetries: 2, retryBufferMs: 0 } },
      clock,
    );
    const send = jest.fn(() => Promise.reject(rateLimit(1)));

    const result = throttler.run(123, undefined, send).catch((error) => error);
    await flush();
    await clock.advance(10_000);
    expect(await result).toBeInstanceOf(ApiException);
    expect(send).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('propagates a non-429 error immediately', async () => {
    const throttler = new ThrottleInterceptor({}, new FakeClock());
    const send = jest.fn(() => Promise.reject(new Error('boom')));
    await expect(throttler.run(123, undefined, send)).rejects.toThrow('boom');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not retry when retry is disabled', async () => {
    const throttler = new ThrottleInterceptor(
      { throttle: { retry: false } },
      new FakeClock(),
    );
    const send = jest.fn(() => Promise.reject(rateLimit(5)));
    await expect(throttler.run(123, undefined, send)).rejects.toBeInstanceOf(
      ApiException,
    );
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('ThrottleInterceptor — intercept (the RxJS seam)', () => {
  it('gates then yields the inner call result for a send', async () => {
    const throttler = new ThrottleInterceptor({}, new FakeClock());
    const next: ApiCallHandler = { handle: () => of('sent') };

    const result = await lastValueFrom(
      throttler.intercept(context('sendMessage', { chat_id: 1 }), next),
    );
    expect(result).toBe('sent');
  });

  it('passes a read (throttled === false) straight through, ungated', () => {
    const throttler = new ThrottleInterceptor({}, new FakeClock());
    const passthrough = of('updates');
    const next: ApiCallHandler = { handle: () => passthrough };

    // The bypass returns next.handle() verbatim — no defer/gating wrapper.
    const result = throttler.intercept(context('getUpdates', {}, false), next);
    expect(result).toBe(passthrough);
  });

  it('passes everything through when disabled (throttle: false)', () => {
    const throttler = new ThrottleInterceptor(
      { throttle: false },
      new FakeClock(),
    );
    const passthrough = of('x');
    const next: ApiCallHandler = { handle: () => passthrough };

    expect(
      throttler.intercept(context('sendMessage', { chat_id: 1 }), next),
    ).toBe(passthrough);
  });
});

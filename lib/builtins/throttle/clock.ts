/**
 * Time + sleep behind an interface, so the throttler is fully deterministic in
 * tests (a fake clock with manual time advance — no real timers).
 */
export interface Clock {
  now(): number;
  /** Resolve after `ms`; reject promptly (AbortError) if `signal` aborts first. */
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

/** DI token for an overridable Clock. No provider by default → SystemClock. */
export const CLOCK = 'nestgram:clock';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      const onAbort = (): void => {
        clearTimeout(timer);
        reject(abortError());
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }
}

function abortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

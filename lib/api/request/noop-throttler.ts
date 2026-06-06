import { SendThrottler } from './throttle.types';

/** Zero-overhead throttler used for `throttle: false` — runs the send immediately. */
export class NoopThrottler implements SendThrottler {
  run<R>(
    _chatId: number | string | undefined,
    _signal: AbortSignal | undefined,
    send: () => Promise<R>,
  ): Promise<R> {
    return send();
  }
}

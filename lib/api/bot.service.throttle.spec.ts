import { BotService } from './bot.service';
import { BotOptions } from './bot-options';
import { ApiPipeline } from './request/api-pipeline';
import {
  resolveThrottleOptions,
  ThrottleInterceptor,
  ThrottleSettings,
} from '../builtins/throttle';
// Deep reaches into throttle internals: this api-layer spec rebuilds the
// throttler the way ThrottleModule does, to exercise the real send path.
import { ChatLimiterRegistry } from '../builtins/throttle/chat-limiter-registry';
import { FakeClock } from '../builtins/throttle/clock.fake';
import { TokenBucket } from '../builtins/throttle/limiters';
import { Message } from '../events';

const originalFetch = global.fetch;
const flush = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

function mockFetch(responses: unknown[]): { calls: number } {
  const state = { calls: 0 };
  global.fetch = (async () => {
    const body = responses[Math.min(state.calls, responses.length - 1)];
    state.calls += 1;
    return { json: async () => body } as Response;
  }) as typeof fetch;
  return state;
}

function bot(options: BotOptions, clock: FakeClock): BotService {
  // Compose the throttler exactly as ThrottleModule does (its collaborators are
  // injected, not assembled by the interceptor), then run it in the pipeline.
  const settings: ThrottleSettings = {
    enabled: options.throttle !== false,
    options: resolveThrottleOptions(options.throttle),
  };
  const global = new TokenBucket(
    settings.options.globalRate,
    settings.options.globalRate,
    settings.options.globalIntervalMs,
    clock,
  );
  const chats = new ChatLimiterRegistry(settings.options, clock);
  const throttle = new ThrottleInterceptor(settings, global, chats, clock);
  return new BotService(options, new ApiPipeline([throttle]));
}

describe('BotService send throttling', () => {
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('retries a 429 through the throttler, then succeeds', async () => {
    const clock = new FakeClock();
    const fetchState = mockFetch([
      {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests',
        parameters: { retry_after: 1 },
      },
      {
        ok: true,
        result: { message_id: 7, date: 1, chat: { id: 1, type: 'private' } },
      },
    ]);

    const promise = bot({ token: '1:T' }, clock).sendMessage(1, 'hi');
    await flush();
    expect(fetchState.calls).toBe(1); // first send 429'd, now parked on retry_after

    await clock.advance(1 * 1000 + 250);
    const result = await promise;
    expect(fetchState.calls).toBe(2); // retried
    expect(result).toBeInstanceOf(Message);
  });

  it('does not throttle reads — getUpdates bypasses the limiter and its retry', async () => {
    const clock = new FakeClock();
    const fetchState = mockFetch([
      {
        ok: false,
        error_code: 429,
        description: 'x',
        parameters: { retry_after: 5 },
      },
    ]);

    // A 429 on a read goes straight up, untouched by the send throttler's
    // backoff — polling must not be coupled to the send budget.
    await expect(
      bot({ token: '1:T' }, clock).getUpdates(),
    ).rejects.toMatchObject({ error_code: 429 });
    expect(fetchState.calls).toBe(1); // no retry, no backoff
  });

  it('does not retry or wait when throttling is disabled', async () => {
    const clock = new FakeClock();
    const fetchState = mockFetch([
      {
        ok: false,
        error_code: 429,
        description: 'x',
        parameters: { retry_after: 5 },
      },
    ]);

    await expect(
      bot({ token: '1:T', throttle: false }, clock).sendMessage(1, 'hi'),
    ).rejects.toMatchObject({ error_code: 429 });
    expect(fetchState.calls).toBe(1); // passthrough — no retry
  });
});

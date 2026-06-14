import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, toArray } from 'rxjs';

import { FakeClock } from '../builtins/throttle/clock.fake';
import { MemoryStore } from '../store/key-value-store';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import {
  OnRateLimit,
  RateLimitKey,
  RateLimitMetadata,
  RateLimitOptions,
  RateLimitRule,
} from './rate-limit.types';
import { RateLimiter } from './rate-limiter';

const CHAT_ID = 42;
const HANDLER_RESULT = 'handled';

/**
 * A fake TelegramExecutionContext exposing what the interceptor and the default
 * key strategy read: `chat`, `from`, `bot`, and the raw `update`.
 */
function tgCtx(chatId: number = CHAT_ID): unknown {
  const chat = { id: chatId };
  return {
    chat,
    from: { id: 7 },
    bot: undefined,
    update: { message: { chat, from: { id: 7 } } },
  };
}

/** A context with no chat — the default key strategy returns undefined for it. */
function noChatCtx(): unknown {
  return { chat: undefined, from: { id: 7 }, bot: undefined, update: {} };
}

/** Per-target metadata: index 0 = handler, index 1 = class. */
interface Meta {
  rule?: [RateLimitRule | undefined, RateLimitRule | undefined];
  skip?: [boolean | undefined, boolean | undefined];
}

function reflectorWith(meta: Meta): Reflector {
  return {
    getAllAndOverride: (key: string) => {
      if (key === RateLimitMetadata.RULE) {
        return meta.rule?.find((r) => r !== undefined);
      }
      if (key === RateLimitMetadata.SKIP) {
        return meta.skip?.find((s) => s !== undefined);
      }
      return undefined;
    },
  } as unknown as Reflector;
}

function contextFor(ctx: unknown): ExecutionContext {
  return {
    getArgByIndex: (i: number) => (i === 1 ? ctx : undefined),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

/** Records whether next.handle() was subscribed (i.e. the handler ran). */
function trackedHandler(): { handler: CallHandler; runs: () => number } {
  let runs = 0;
  const handler: CallHandler = {
    handle: () => {
      runs += 1;
      return of(HANDLER_RESULT);
    },
  };
  return { handler, runs: () => runs };
}

function build(
  options: RateLimitOptions,
  meta: Meta = {},
  clock = new FakeClock(),
): { interceptor: RateLimitInterceptor; clock: FakeClock } {
  const limiter = new RateLimiter(new MemoryStore(), clock);
  const interceptor = new RateLimitInterceptor(
    reflectorWith(meta),
    limiter,
    options,
  );
  return { interceptor, clock };
}

/** Subscribe and collect every emitted value, like the engine would. */
async function emitted(
  interceptor: RateLimitInterceptor,
  ctx: unknown,
  handler: CallHandler,
): Promise<unknown[]> {
  return firstValueFrom(
    interceptor.intercept(contextFor(ctx), handler).pipe(toArray()),
  );
}

const RULE: RateLimitRule = { limit: 2, windowMs: 1_000 };

describe('RateLimitInterceptor', () => {
  it('passes through and lets the handler run while under the limit', async () => {
    const { interceptor } = build({ default: RULE });
    const { handler, runs } = trackedHandler();

    expect(await emitted(interceptor, tgCtx(), handler)).toEqual([
      HANDLER_RESULT,
    ]);
    expect(await emitted(interceptor, tgCtx(), handler)).toEqual([
      HANDLER_RESULT,
    ]);
    expect(runs()).toBe(2);
  });

  it('drops over-limit updates silently — handler never runs, nothing emitted', async () => {
    const { interceptor } = build({ default: RULE });
    const { handler, runs } = trackedHandler();

    await emitted(interceptor, tgCtx(), handler);
    await emitted(interceptor, tgCtx(), handler);
    const third = await emitted(interceptor, tgCtx(), handler);

    expect(third).toEqual([]); // EMPTY — no reply produced
    expect(runs()).toBe(2); // the third update never reached the handler
  });

  it('per-route @RateLimit overrides the module default', async () => {
    const strict: RateLimitRule = { limit: 1, windowMs: 1_000 };
    const { interceptor } = build(
      { default: { limit: 100, windowMs: 1_000 } },
      { rule: [strict, undefined] },
    );
    const { handler, runs } = trackedHandler();

    await emitted(interceptor, tgCtx(), handler);
    const second = await emitted(interceptor, tgCtx(), handler);

    expect(second).toEqual([]); // strict per-route limit of 1 wins
    expect(runs()).toBe(1);
  });

  it('@SkipRateLimit exempts the route entirely', async () => {
    const { interceptor } = build(
      { default: { limit: 1, windowMs: 1_000 } },
      { skip: [true, undefined] },
    );
    const { handler, runs } = trackedHandler();

    for (let i = 0; i < 5; i += 1) {
      expect(await emitted(interceptor, tgCtx(), handler)).toEqual([
        HANDLER_RESULT,
      ]);
    }
    expect(runs()).toBe(5);
  });

  it('uses a custom key to scope the counter', async () => {
    // A constant key collapses every update into one bucket regardless of chat.
    const key: RateLimitKey = () => 'shared';
    const { interceptor } = build({ default: { ...RULE, key } });
    const { handler, runs } = trackedHandler();

    await emitted(interceptor, tgCtx(1), handler);
    await emitted(interceptor, tgCtx(2), handler);
    const third = await emitted(interceptor, tgCtx(3), handler); // different chat, same bucket

    expect(third).toEqual([]);
    expect(runs()).toBe(2);
  });

  it('emits the onLimit return value as a reply on drop', async () => {
    const warning = 'Slow down!';
    const onLimit: OnRateLimit = () => warning;
    const { interceptor } = build({
      default: { limit: 1, windowMs: 1_000, onLimit },
    });
    const { handler, runs } = trackedHandler();

    await emitted(interceptor, tgCtx(), handler);
    const second = await emitted(interceptor, tgCtx(), handler);

    expect(second).toEqual([warning]); // flows through the normal reply path
    expect(runs()).toBe(1); // handler still didn't run
  });

  it('emits nothing when onLimit returns undefined', async () => {
    const onLimit: OnRateLimit = () => undefined;
    const { interceptor } = build({
      default: { limit: 1, windowMs: 1_000, onLimit },
    });
    const { handler } = trackedHandler();

    await emitted(interceptor, tgCtx(), handler);
    expect(await emitted(interceptor, tgCtx(), handler)).toEqual([]);
  });

  it('allows again after the window elapses (fake clock)', async () => {
    const { interceptor, clock } = build({
      default: { limit: 1, windowMs: 1_000 },
    });
    const { handler, runs } = trackedHandler();

    await emitted(interceptor, tgCtx(), handler);
    expect(await emitted(interceptor, tgCtx(), handler)).toEqual([]); // denied

    await clock.advance(1_001);
    expect(await emitted(interceptor, tgCtx(), handler)).toEqual([
      HANDLER_RESULT,
    ]);
    expect(runs()).toBe(2);
  });

  it('passes through when no rule applies (no default, no @RateLimit)', async () => {
    const { interceptor } = build({});
    const { handler, runs } = trackedHandler();

    for (let i = 0; i < 5; i += 1) {
      expect(await emitted(interceptor, tgCtx(), handler)).toEqual([
        HANDLER_RESULT,
      ]);
    }
    expect(runs()).toBe(5);
  });

  it('passes through when the key resolves to undefined (no chat)', async () => {
    // Default key (defaultConversationKey) returns undefined with no chat.
    const { interceptor } = build({ default: { limit: 1, windowMs: 1_000 } });
    const { handler, runs } = trackedHandler();

    expect(await emitted(interceptor, noChatCtx(), handler)).toEqual([
      HANDLER_RESULT,
    ]);
    expect(await emitted(interceptor, noChatCtx(), handler)).toEqual([
      HANDLER_RESULT,
    ]);
    expect(runs()).toBe(2); // never limited — nothing to scope to
  });
});

import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { defer, EMPTY, from, of, type Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { TelegramExecutionContext } from '../engine/context';
import { defaultConversationKey } from '../store/conversation-key';
import {
  OnRateLimit,
  RateLimitKey,
  RateLimitMetadata,
  RateLimitOptions,
  RateLimitRule,
  RATE_LIMIT_OPTIONS,
} from './rate-limit.types';
import { RateLimiter } from './rate-limiter';

/** The rule plus the resolved key/on-limit fallbacks that actually apply. */
interface ResolvedLimit {
  rule: RateLimitRule;
  key: RateLimitKey;
  onLimit?: OnRateLimit;
}

/**
 * Inbound flood control as a global Nest interceptor — the kind a bot author
 * could have written (no privileged core). Registered via `APP_INTERCEPTOR` by
 * {@link RateLimitModule}.
 *
 * It runs the {@link RateLimiter} BEFORE the handler. Within limit, it
 * increments the counter and calls `next.handle()` so the update is handled
 * normally. Over limit, it does NOT call `next.handle()` — so the handler never
 * runs and no reply is produced — and emits either nothing ({@link EMPTY},
 * silent drop) or, when an `onLimit` callback returns a value, that value
 * (which then flows through the normal reply path, e.g. a "slow down" message).
 *
 * It is deliberately an interceptor, not a guard: a `CanActivate` returning
 * `false` makes Nest throw `ForbiddenException`, which is not a silent drop and
 * would hit the exception filters. An interceptor short-circuits cleanly.
 *
 * Pass-through (calls `next.handle()` with no counting) when: the route is
 * `@SkipRateLimit()`; no rule applies (no module `default`, no `@RateLimit`);
 * or the resolved key is `undefined` (no chat to scope to).
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimiter,
    @Inject(RATE_LIMIT_OPTIONS) private readonly options: RateLimitOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const resolved = this.resolve(context);
    if (!resolved) {
      return next.handle();
    }

    const ctx = TelegramExecutionContext.of(context);
    const key = resolved.key(ctx);
    if (key === undefined) {
      return next.handle();
    }

    // defer: the limiter is async and stateful, so re-run it per subscription
    // rather than at assembly time.
    return defer(() =>
      from(this.limiter.hit(key, resolved.rule.limit, resolved.rule.windowMs)),
    ).pipe(
      mergeMap((allowed) =>
        allowed ? next.handle() : this.onDenied(ctx, resolved.onLimit),
      ),
    );
  }

  /** Emit the `onLimit` value (if any), else nothing — the handler never ran. */
  private onDenied(
    ctx: TelegramExecutionContext,
    onLimit: OnRateLimit | undefined,
  ): Observable<unknown> {
    if (!onLimit) {
      return EMPTY;
    }
    return from(Promise.resolve(onLimit(ctx))).pipe(
      mergeMap((result) => (result === undefined ? EMPTY : of(result))),
    );
  }

  /**
   * The effective rule for this route, or `undefined` to pass through.
   * `@SkipRateLimit` wins; otherwise the nearest `@RateLimit` (handler over
   * class) or the module default. Key/on-limit fall back module-then-default.
   */
  private resolve(context: ExecutionContext): ResolvedLimit | undefined {
    const targets = [context.getHandler(), context.getClass()];

    const skipped = this.reflector.getAllAndOverride<boolean>(
      RateLimitMetadata.SKIP,
      targets,
    );
    if (skipped) {
      return undefined;
    }

    const rule =
      this.reflector.getAllAndOverride<RateLimitRule>(
        RateLimitMetadata.RULE,
        targets,
      ) ?? this.options.default;
    if (!rule) {
      return undefined;
    }

    return {
      rule,
      key: rule.key ?? this.options.key ?? defaultConversationKey,
      onLimit: rule.onLimit ?? this.options.onLimit,
    };
  }
}

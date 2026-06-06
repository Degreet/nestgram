import type { Observable } from 'rxjs';

import type { ApiMethod } from '../methods/api-method';
import type { ApiRequest } from './request.types';

/** The context type an {@link ApiExecutionContext} reports — distinguishes the
 * outbound send side from Nest's inbound `'telegram'` handler context. */
export type ApiContextType = 'telegram:api';

/**
 * The cold inner call. `handle()` returns a **cold** Observable: nothing is sent
 * until it is subscribed, and **each** subscription re-runs the whole
 * serialize → fetch → parse → wrap. That cold-ness is load-bearing — it lets a
 * `.pipe(retry(n))` re-fire only the call. An interceptor MUST NOT multicast it
 * (no `share`/`shareReplay`/`Subject`): doing so breaks retry, which relies on
 * re-subscription re-firing the call. Mirrors `@nestjs/common`'s `CallHandler`
 * (`handle(): Observable<T>`) exactly.
 */
export interface ApiCallHandler<T = unknown> {
  handle(): Observable<T>;
}

/**
 * The outbound call context. Shaped like Nest's `ExecutionContext` so the
 * vocabulary carries over — but deliberately **not** that type: `getHandler()` /
 * `switchToHttp()` are meaningless outbound, and unlike the read-only inbound
 * context this exposes the **mutable** {@link ApiRequest} (rewriting the payload
 * before it goes out is the whole point of the send side). `getMethod()` exposes
 * the command object (its `method` name, `hasMedia`, etc.) for policy decisions.
 */
export interface ApiExecutionContext {
  /** The mutable outbound request; mutate `payload`/`method`/`token` in place. */
  getRequest(): ApiRequest;
  /** The command object being sent — for its `method` name, `hasMedia`, etc. */
  getMethod(): ApiMethod<unknown, unknown>;
  /** AbortSignal threaded from the per-call options (shutdown / timeout). */
  getSignal(): AbortSignal | undefined;
  /** Always `'telegram:api'` — lets one class branch inbound vs outbound. */
  getType(): ApiContextType;
}

/**
 * A hook around an outbound Bot API call — the same `intercept(context, next)`
 * contract Nest uses for handler interceptors, on the send side. `next.handle()`
 * is the cold inner call; return it (optionally `.pipe(...)`d) to send. A pure
 * request-mutator just mutates `context.getRequest()` and returns `next.handle()`;
 * an async one returns `Promise<Observable>` so `async intercept() { await x;
 * return next.handle(); }` reads naturally.
 *
 * The framework's own send-time behaviours (token validation, default
 * `parse_mode`, throttling) are ordinary `ApiInterceptor`s registered by default
 * — no privileged core; a user could have written any of them, and can add,
 * reorder, or replace them. An interceptor MUST emit exactly the one value from
 * `next.handle()` (don't return `EMPTY` or filter the call out). Note that
 * `next.handle().pipe(retry(n))` re-subscribes everything nested below it (the
 * inner interceptors and the wire call), so their mutations must be idempotent —
 * the same as a Nest handler interceptor that retries.
 */
export interface ApiInterceptor<T = unknown, R = unknown> {
  intercept(
    context: ApiExecutionContext,
    next: ApiCallHandler<T>,
  ): Observable<R> | Promise<Observable<R>>;
}

/**
 * DI token for the ordered array of {@link ApiInterceptor}s the pipeline runs,
 * outermost first: the built-ins (token validation, default parse-mode), then
 * any user-supplied ones, then the throttler innermost (closest to the wire, so
 * it reads `chat_id` after the mutators). Assembled as an explicit array via
 * `useFactory` — Nest has no generic `multi: true` aggregation.
 */
export const API_INTERCEPTORS = 'nestgram:api_interceptors';

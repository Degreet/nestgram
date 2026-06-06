import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  defer,
  from,
  isObservable,
  lastValueFrom,
  mergeAll,
  type Observable,
} from 'rxjs';
import { defaultIfEmpty } from 'rxjs/operators';

import { NestgramError } from '../../exceptions';
import {
  API_INTERCEPTORS,
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from './api-interceptor.types';

/** Sentinel for "the chain completed without emitting" — turned into a friendly
 * error rather than rxjs's opaque `EmptyError`. Module-private. */
const NO_RESULT = Symbol('nestgram:no-result');

/** A Promise (or any thenable) — what an `async intercept()` returns. */
function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Composes the registered {@link ApiInterceptor}s into a Nest-style onion around
 * the cold inner call, and awaits the single result.
 *
 * Each interceptor's `intercept(context, next)` is invoked at **subscribe time**
 * inside a `defer`, so a synchronous throw (e.g. token validation) becomes a
 * rejected Promise, not a sync throw out of `run`. Interceptors compose
 * right-to-left so `interceptors[0]` is outermost (runs first inbound, last on
 * the way out) — identical to Nest's interceptor nesting. The chain is awaited
 * via `lastValueFrom`, which subscribes **once** and rejects on error, so an
 * `ApiException` still reaches the caller / Nest exception filters unchanged.
 *
 * The chain must never be multicast: `run` relies on a single, cold
 * subscription, so the throttler's retry (and any user `.pipe(retry())`)
 * re-fires the actual call.
 */
@Injectable()
export class ApiPipeline {
  private readonly interceptors: ApiInterceptor[];

  constructor(
    @Optional()
    @Inject(API_INTERCEPTORS)
    interceptors: ApiInterceptor[] | null,
  ) {
    this.interceptors = interceptors ?? [];
  }

  async run<R>(
    context: ApiExecutionContext,
    innerCall: Observable<R>,
  ): Promise<R> {
    const terminal: ApiCallHandler = { handle: () => innerCall };
    const chain = this.interceptors.reduceRight<ApiCallHandler>(
      (next, interceptor) => ({
        handle: () =>
          defer(() => {
            const result = interceptor.intercept(context, next);
            if (isObservable(result)) {
              return result;
            }
            // An async mutator returns Promise<Observable>; flatten it.
            if (isThenable(result)) {
              return from(result).pipe(mergeAll());
            }
            // A bare value would make `from()` throw an opaque rxjs error — name
            // the offending interceptor instead.
            throw new NestgramError(
              `An API interceptor (${interceptor.constructor.name}) returned a ` +
                `${typeof result} from intercept() — it must return an Observable ` +
                `(or Promise<Observable>). Return next.handle().`,
            );
          }),
      }),
      terminal,
    );

    const value = await lastValueFrom(
      chain.handle().pipe(defaultIfEmpty(NO_RESULT)),
    );
    if (value === NO_RESULT) {
      throw new NestgramError(
        'An API interceptor completed without emitting a result — did it ' +
          'return EMPTY or filter out the call? Return next.handle().',
      );
    }
    return value as R;
  }
}

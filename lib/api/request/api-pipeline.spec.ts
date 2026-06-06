import { defer, EMPTY, Observable, of, throwError } from 'rxjs';
import { retry } from 'rxjs/operators';

import { ApiPipeline } from './api-pipeline';
import { ApiExecutionContext, ApiInterceptor } from './api-interceptor.types';
import { ApiRequest } from './request.types';
import { NestgramError } from '../../exceptions';

function context(payload: Record<string, unknown> = {}): ApiExecutionContext {
  const request: ApiRequest = { method: 'sendMessage', payload, token: 'T' };
  return {
    getRequest: () => request,
    getMethod: () => ({ method: 'sendMessage' }),
    getSignal: () => undefined,
    getType: () => 'telegram:api',
  };
}

const tag = (name: string, order: string[]): ApiInterceptor =>
  ({
    intercept: (_ctx, next) => {
      order.push(name);
      return next.handle();
    },
  } as ApiInterceptor);

describe('ApiPipeline', () => {
  it('composes interceptors outermost-first around the inner call', async () => {
    const order: string[] = [];
    const pipeline = new ApiPipeline([tag('a', order), tag('b', order)]);

    const result = await pipeline.run(context(), of('R'));

    expect(order).toEqual(['a', 'b']); // a is outermost, runs first inbound
    expect(result).toBe('R');
  });

  it('is a passthrough with no interceptors registered', async () => {
    const pipeline = new ApiPipeline(null);
    await expect(pipeline.run(context(), of('X'))).resolves.toBe('X');
  });

  it('awaits an async (Promise<Observable>) interceptor', async () => {
    const asyncMutator: ApiInterceptor = {
      intercept: async (ctx, next) => {
        await Promise.resolve();
        ctx.getRequest().payload.touched = true;
        return next.handle();
      },
    };
    const ctx = context();
    await pipelineWith(asyncMutator).run(ctx, of('ok'));
    expect(ctx.getRequest().payload.touched).toBe(true);
  });

  it('keeps the inner call cold — a retry re-subscribes (re-fires) it', async () => {
    let calls = 0;
    const inner: Observable<string> = defer(() => {
      calls += 1;
      return calls === 1 ? throwError(() => new Error('once')) : of('ok');
    });
    const retrying: ApiInterceptor = {
      intercept: (_ctx, next) => next.handle().pipe(retry(1)),
    };

    await expect(pipelineWith(retrying).run(context(), inner)).resolves.toBe(
      'ok',
    );
    expect(calls).toBe(2); // re-subscribed on retry
  });

  it('turns a synchronous interceptor throw into a rejected promise', async () => {
    const thrower: ApiInterceptor = {
      intercept: () => {
        throw new Error('sync boom');
      },
    };
    await expect(pipelineWith(thrower).run(context(), of('x'))).rejects.toThrow(
      'sync boom',
    );
  });

  it('reports a friendly error when an interceptor emits nothing', async () => {
    const empties: ApiInterceptor = { intercept: () => EMPTY };
    await expect(
      pipelineWith(empties).run(context(), of('x')),
    ).rejects.toBeInstanceOf(NestgramError);
  });

  it('reports a friendly error when an interceptor returns a non-Observable', async () => {
    const bare = { intercept: () => 'oops' } as unknown as ApiInterceptor;
    await expect(
      pipelineWith(bare).run(context(), of('x')),
    ).rejects.toBeInstanceOf(NestgramError);
  });
});

function pipelineWith(interceptor: ApiInterceptor): ApiPipeline {
  return new ApiPipeline([interceptor]);
}

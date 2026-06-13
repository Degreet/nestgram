import { lastValueFrom, of, throwError, type Observable } from 'rxjs';

import { IgnoreNotModifiedInterceptor } from './ignore-not-modified.interceptor';
import { ApiException } from '../../exceptions/api.exception';
import { ApiCallHandler, ApiExecutionContext } from '../../api/request';
import { ApiError } from '../../api/api-response';

const ctx = {} as ApiExecutionContext;

function apiException(error_code: number, description: string): ApiException {
  const details: ApiError = { ok: false, error_code, description };
  return new ApiException(details, {});
}

function run(enabled: boolean, next: ApiCallHandler): Promise<unknown> {
  const interceptor = new IgnoreNotModifiedInterceptor({
    ignoreNotModified: enabled,
  });
  return lastValueFrom(interceptor.intercept(ctx, next) as Observable<unknown>);
}

const notModified = (): ApiCallHandler => ({
  handle: () =>
    throwError(() => apiException(400, 'Bad Request: message is not modified')),
});

describe('IgnoreNotModifiedInterceptor', () => {
  it('swallows "not modified" into a true result when enabled', async () => {
    await expect(run(true, notModified())).resolves.toBe(true);
  });

  it('passes successful results through untouched', async () => {
    await expect(run(true, { handle: () => of('ok') })).resolves.toBe('ok');
  });

  it('rethrows a different ApiException (stale edit is not swallowed)', async () => {
    const handler: ApiCallHandler = {
      handle: () =>
        throwError(() =>
          apiException(400, "Bad Request: message can't be edited"),
        ),
    };
    await expect(run(true, handler)).rejects.toThrow(ApiException);
  });

  it('rethrows a non-ApiException error', async () => {
    const boom = new Error('network down');
    await expect(
      run(true, { handle: () => throwError(() => boom) }),
    ).rejects.toBe(boom);
  });

  it('passes "not modified" through unchanged when disabled', async () => {
    await expect(run(false, notModified())).rejects.toThrow(ApiException);
  });
});

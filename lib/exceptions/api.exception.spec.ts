import { ApiException } from './api.exception';
import { KnownApiError } from './error-catalog';
import { ApiError } from '../api/api-response';

function apiException(error_code: number, description: string): ApiException {
  const details: ApiError = { ok: false, error_code, description };
  return new ApiException(details, { chat_id: 1 });
}

describe('ApiException predicates', () => {
  describe('is', () => {
    it('matches on error_code alone', () => {
      expect(ApiException.is(apiException(403, 'whatever'), 403)).toBe(true);
      expect(ApiException.is(apiException(400, 'whatever'), 403)).toBe(false);
    });

    it('narrows by description when a pattern is given', () => {
      const error = apiException(400, 'Bad Request: query is too old');
      expect(ApiException.is(error, 400, /too old/i)).toBe(true);
      expect(ApiException.is(error, 400, /not found/i)).toBe(false);
    });

    it('is false for non-ApiException values', () => {
      expect(ApiException.is(new Error('nope'), 400)).toBe(false);
      expect(ApiException.is('403', 403)).toBe(false);
      expect(ApiException.is(undefined, 400)).toBe(false);
    });

    it('narrows the type so the caught error is typed', () => {
      const error: unknown = apiException(429, 'Too Many Requests');
      if (ApiException.is(error, 429)) {
        // Compiles only if `error` narrowed to ApiException.
        expect(error.error_code).toBe(429);
      } else {
        fail('expected the predicate to narrow');
      }
    });
  });

  describe('matches', () => {
    it('matches a catalog entry by code and phrasing', () => {
      const error = apiException(
        400,
        'Bad Request: message is not modified: specified new message content...',
      );
      expect(ApiException.matches(error, KnownApiError.notModified)).toBe(true);
    });

    it('rejects the right phrasing under the wrong code', () => {
      const error = apiException(403, 'message is not modified');
      expect(ApiException.matches(error, KnownApiError.notModified)).toBe(
        false,
      );
    });
  });

  describe('named predicates', () => {
    it('isNotModified', () => {
      expect(
        ApiException.isNotModified(
          apiException(400, 'Bad Request: message is not modified'),
        ),
      ).toBe(true);
      expect(
        ApiException.isNotModified(apiException(400, 'chat not found')),
      ).toBe(false);
    });

    it('isBlockedByUser', () => {
      expect(
        ApiException.isBlockedByUser(
          apiException(403, 'Forbidden: bot was blocked by the user'),
        ),
      ).toBe(true);
      expect(
        ApiException.isBlockedByUser(apiException(400, 'bad request')),
      ).toBe(false);
    });

    it('isChatNotFound', () => {
      expect(
        ApiException.isChatNotFound(
          apiException(400, 'Bad Request: chat not found'),
        ),
      ).toBe(true);
      expect(
        ApiException.isChatNotFound(apiException(403, 'chat not found')),
      ).toBe(false);
    });
  });
});

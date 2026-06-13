import { ApiError, ResponseParameters } from '../api/api-response';
import { ApiErrorMatcher, KnownApiError } from './error-catalog';
import { NestgramError } from './nestgram.error';

/**
 * Thrown when Telegram rejects an API call (`ok: false`). Carries the Bot API
 * `error_code` and `description`, plus `parameters` (e.g. `retry_after` on a
 * 429) and the request `body` that was rejected. Catch it in a handler or an
 * exception filter to react to specific failures.
 *
 * The static predicates classify a caught error by its `(error_code,
 * description)` signature without a hand-rolled substring check — the phrasing
 * lives once in the {@link KnownApiError} catalog. Each narrows `unknown` to
 * `ApiException`, so `catch (error)` blocks stay typed.
 */
export class ApiException extends NestgramError {
  readonly name = 'ApiError';

  readonly ok = false;
  readonly error_code: number;
  readonly description: string;
  readonly parameters?: ResponseParameters;

  constructor(details: ApiError, readonly body: any) {
    super([details.error_code, details.description].join(' '));

    this.error_code = details.error_code;
    this.description = details.description;
    this.parameters = details.parameters;
  }

  /**
   * Matches an `error_code`, optionally narrowing by a `description` pattern.
   * The general escape hatch for codes/phrasings not yet in the catalog:
   * `ApiException.is(error, 403)` or `ApiException.is(error, 400, /too long/i)`.
   */
  static is(
    error: unknown,
    code: number,
    description?: RegExp,
  ): error is ApiException {
    return (
      error instanceof ApiException &&
      error.error_code === code &&
      (description?.test(error.description) ?? true)
    );
  }

  /** Matches a caught error against a {@link KnownApiError} catalog entry. */
  static matches(
    error: unknown,
    matcher: ApiErrorMatcher,
  ): error is ApiException {
    return ApiException.is(error, matcher.code, matcher.description);
  }

  /** A double-edit with identical content (`400 message is not modified`). */
  static isNotModified(error: unknown): error is ApiException {
    return ApiException.matches(error, KnownApiError.notModified);
  }

  /** The user blocked the bot (`403 bot was blocked by the user`). */
  static isBlockedByUser(error: unknown): error is ApiException {
    return ApiException.matches(error, KnownApiError.blockedByUser);
  }

  /** The target chat does not exist (`400 chat not found`). */
  static isChatNotFound(error: unknown): error is ApiException {
    return ApiException.matches(error, KnownApiError.chatNotFound);
  }
}

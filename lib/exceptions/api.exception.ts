import { ApiError, ResponseParameters } from '../api/api-response';
import { NestgramError } from './nestgram.error';

/**
 * Thrown when Telegram rejects an API call (`ok: false`). Carries the Bot API
 * `error_code` and `description`, plus `parameters` (e.g. `retry_after` on a
 * 429) and the request `body` that was rejected. Catch it in a handler or an
 * exception filter to react to specific failures.
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
}

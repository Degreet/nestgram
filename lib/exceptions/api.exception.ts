import { ApiError, ResponseParameters } from '../api/api-response';
import { NestgramError } from './nestgram.error';

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

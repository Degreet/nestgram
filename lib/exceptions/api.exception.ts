import { ApiError, ResponseParameters } from '../types';

export class ApiException extends Error {
  public readonly name = 'ApiError';

  public readonly ok = false;
  public readonly error_code: number;
  public readonly description: string;
  public readonly parameters?: ResponseParameters;

  constructor(details: ApiError, public readonly body: any) {
    super([details.error_code, details.description].join(' '));

    this.error_code = details.error_code;
    this.description = details.description;
    this.parameters = details.parameters;
  }
}

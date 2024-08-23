import { ApiException } from '../exceptions';

import { ApiError, ApiResponse } from '../types';

export abstract class ApiMethod<T, R> {
  protected abstract readonly methodName: string;
  protected abstract readonly isFormData: boolean;

  protected constructor(
    private readonly token: string,
    private readonly options?: T,
  ) {}

  async fetch(): Promise<R> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/${this.methodName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.options && JSON.stringify(this.options),
      },
    );

    const data: ApiResponse<R> = await response.json();

    if (!data.ok) {
      throw new ApiException(data as ApiError, this.options);
    }

    return data.result;
  }
}

import { ApiException } from '../exceptions';

import { ApiError, ApiResponse } from '../types';

export interface ApiMethod<T, R> {
  interceptor?(object: R): R;
}

export abstract class ApiMethod<T, R> {
  protected abstract readonly methodName: string;
  protected abstract readonly isFormData: boolean;

  protected constructor(
    public readonly token: string,
    public readonly options?: T,
  ) {}

  public async fetch(signal?: AbortSignal): Promise<R> {
    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/${this.methodName}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.options && JSON.stringify(this.options),
        signal,
      },
    );

    const data: ApiResponse<R> = await response.json();

    if (!data.ok) {
      throw new ApiException(data as ApiError, this.options);
    }

    const object = data.result;

    return this.interceptor?.(object) ?? object;
  }
}

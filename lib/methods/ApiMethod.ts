import { ApiException } from '../exceptions';

import { ApiError, ApiResponse } from '../types';
import { FormDataBuilder } from '../utils/FormDataBuilder';

export interface ApiMethod<T, R> {
  interceptor?(object: R): R;
  hasMedia?: boolean;
  isAttachMedia?: boolean;
}

export abstract class ApiMethod<T, R> {
  protected abstract readonly methodName: string;

  protected constructor(readonly token: string, readonly options?: T) {}

  private createJSONPayload(): RequestInit {
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', connection: 'keep-alive' },
      body: this.options && JSON.stringify(this.options),
    };
  }

  private async createFormDataPayload(): Promise<RequestInit> {
    return {
      method: 'POST',
      headers: {
        connection: 'keep-alive',
      },
      body: this.isAttachMedia
        ? await FormDataBuilder.createAttachedData(this.options ?? {})
        : await FormDataBuilder.createInlineData(this.options ?? {}),
    };
  }

  private async createPayload() {
    if (this.hasMedia) {
      return await this.createFormDataPayload();
    } else {
      return this.createJSONPayload();
    }
  }

  async fetch(signal?: AbortSignal): Promise<R> {
    const payload = await this.createPayload();

    const response = await fetch(
      `https://api.telegram.org/bot${this.token}/${this.methodName}`,
      { ...payload, signal },
    );

    const data: ApiResponse<R> = (await response.json()) as ApiResponse<R>;

    if (!data.ok) {
      throw new ApiException(data as ApiError, this.options);
    }

    const { result } = data;

    return this.interceptor?.(result) ?? result;
  }
}

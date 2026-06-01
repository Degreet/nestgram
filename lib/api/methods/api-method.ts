import { ApiException } from '../../exceptions';

import { ApiError, ApiResponse } from '../api-response';
import { createAttachedData, createInlineData } from '../form-data';

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
    const options = (this.options ?? {}) as Record<string, unknown>;
    return {
      method: 'POST',
      headers: {
        connection: 'keep-alive',
      },
      body: this.isAttachMedia
        ? await createAttachedData(options)
        : await createInlineData(options),
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

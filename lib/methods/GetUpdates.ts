import { ApiMethod } from './ApiMethod';
import { Update } from '../../types';

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export class GetUpdates extends ApiMethod<GetUpdatesOptions, Update[]> {
  protected readonly methodName = 'getUpdates';
  protected readonly isFormData = false;

  constructor(token: string, options?: GetUpdatesOptions) {
    super(token, options);
  }
}

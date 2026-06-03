import { ApiMethod } from './api-method';
import { Update } from '../update.types';

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export class GetUpdates extends ApiMethod<GetUpdatesOptions, Update[]> {
  readonly method = 'getUpdates';

  constructor(payload?: GetUpdatesOptions) {
    super(payload);
  }
}

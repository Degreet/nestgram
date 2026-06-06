import { ApiMethod } from './api-method';
import type { RawUpdate } from '../../events/raw-update.types';

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export class GetUpdates extends ApiMethod<GetUpdatesOptions, RawUpdate[]> {
  readonly method = 'getUpdates';

  readonly throttled = false;

  constructor(payload?: GetUpdatesOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawUpdate } from '../../events/raw-update.types';

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

/**
 * Use this method to receive incoming updates using long polling (wiki). Returns an Array of Update objects.
 * @see https://core.telegram.org/bots/api#getupdates
 */
export class GetUpdates extends ApiMethod<GetUpdatesOptions, RawUpdate[]> {
  readonly method = 'getUpdates';

  constructor(payload?: GetUpdatesOptions) {
    super(payload);
  }
}

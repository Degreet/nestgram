import { ApiMethod } from './api-method';
import type { RawUserProfileAudios } from '../../events/raw-update.types';

export interface GetUserProfileAudiosOptions {
  user_id: number;
  offset?: number;
  limit?: number;
}

export class GetUserProfileAudios extends ApiMethod<
  GetUserProfileAudiosOptions,
  RawUserProfileAudios
> {
  readonly method = 'getUserProfileAudios';

  constructor(payload: GetUserProfileAudiosOptions) {
    super(payload);
  }
}

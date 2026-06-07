import { ApiMethod } from './api-method';
import type { RawUserProfileAudios } from '../../events/raw-update.types';

export interface GetUserProfileAudiosOptions {
  user_id: number;
  offset?: number;
  limit?: number;
}

/**
 * Use this method to get a list of profile audios for a user. Returns a UserProfileAudios object.
 * @see https://core.telegram.org/bots/api#getuserprofileaudios
 */
export class GetUserProfileAudios extends ApiMethod<
  GetUserProfileAudiosOptions,
  RawUserProfileAudios
> {
  readonly method = 'getUserProfileAudios';

  constructor(payload: GetUserProfileAudiosOptions) {
    super(payload);
  }
}

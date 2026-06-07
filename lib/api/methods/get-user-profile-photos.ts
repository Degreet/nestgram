import { ApiMethod } from './api-method';
import type { RawUserProfilePhotos } from '../../events/raw-update.types';

export interface GetUserProfilePhotosOptions {
  user_id: number;
  offset?: number;
  limit?: number;
}

/**
 * Use this method to get a list of profile pictures for a user. Returns a UserProfilePhotos object.
 * @see https://core.telegram.org/bots/api#getuserprofilephotos
 */
export class GetUserProfilePhotos extends ApiMethod<
  GetUserProfilePhotosOptions,
  RawUserProfilePhotos
> {
  readonly method = 'getUserProfilePhotos';

  constructor(payload: GetUserProfilePhotosOptions) {
    super(payload);
  }
}

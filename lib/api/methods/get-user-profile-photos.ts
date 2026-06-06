import { ApiMethod } from './api-method';
import type { RawUserProfilePhotos } from '../../events/raw-update.types';

export interface GetUserProfilePhotosOptions {
  user_id: number;
  offset?: number;
  limit?: number;
}

export class GetUserProfilePhotos extends ApiMethod<
  GetUserProfilePhotosOptions,
  RawUserProfilePhotos
> {
  readonly method = 'getUserProfilePhotos';

  constructor(payload: GetUserProfilePhotosOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawInputProfilePhoto } from '../../events/raw-update.types';

export interface SetMyProfilePhotoOptions {
  photo: RawInputProfilePhoto;
}

export class SetMyProfilePhoto extends ApiMethod<
  SetMyProfilePhotoOptions,
  true
> {
  readonly method = 'setMyProfilePhoto';

  constructor(payload: SetMyProfilePhotoOptions) {
    super(payload);
  }
}

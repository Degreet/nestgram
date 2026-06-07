import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputProfilePhoto } from '../../events/raw-update.types';

export interface SetMyProfilePhotoOptions {
  photo: RawInputProfilePhoto;
}

export class SetMyProfilePhoto extends ApiMethod<
  SetMyProfilePhotoOptions,
  true
> {
  readonly method = 'setMyProfilePhoto';

  readonly isAttachMedia = true;

  constructor(payload: SetMyProfilePhotoOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputProfilePhoto } from '../../events/raw-update.types';

export interface SetMyProfilePhotoOptions {
  photo: RawInputProfilePhoto;
}

/**
 * Changes the profile photo of the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmyprofilephoto
 */
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

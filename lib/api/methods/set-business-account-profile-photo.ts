import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputProfilePhoto } from '../../events/raw-update.types';

export interface SetBusinessAccountProfilePhotoOptions {
  business_connection_id: string;
  photo: RawInputProfilePhoto;
  is_public?: boolean;
}

/**
 * Changes the profile photo of a managed business account. Requires the can_edit_profile_photo business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#setbusinessaccountprofilephoto
 */
export class SetBusinessAccountProfilePhoto extends ApiMethod<
  SetBusinessAccountProfilePhotoOptions,
  true
> {
  readonly method = 'setBusinessAccountProfilePhoto';

  readonly isAttachMedia = true;

  constructor(payload: SetBusinessAccountProfilePhotoOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

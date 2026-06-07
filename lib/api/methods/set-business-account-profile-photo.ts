import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputProfilePhoto } from '../../events/raw-update.types';

export interface SetBusinessAccountProfilePhotoOptions {
  business_connection_id: string;
  photo: RawInputProfilePhoto;
  is_public?: boolean;
}

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

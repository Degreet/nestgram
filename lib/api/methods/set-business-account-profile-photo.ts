import { ApiMethod } from './api-method';
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

  constructor(payload: SetBusinessAccountProfilePhotoOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface RemoveBusinessAccountProfilePhotoOptions {
  business_connection_id: string;
  is_public?: boolean;
}

/**
 * Removes the current profile photo of a managed business account. Requires the can_edit_profile_photo business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#removebusinessaccountprofilephoto
 */
export class RemoveBusinessAccountProfilePhoto extends ApiMethod<
  RemoveBusinessAccountProfilePhotoOptions,
  true
> {
  readonly method = 'removeBusinessAccountProfilePhoto';

  constructor(payload: RemoveBusinessAccountProfilePhotoOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface RemoveBusinessAccountProfilePhotoOptions {
  business_connection_id: string;
  is_public?: boolean;
}

export class RemoveBusinessAccountProfilePhoto extends ApiMethod<
  RemoveBusinessAccountProfilePhotoOptions,
  true
> {
  readonly method = 'removeBusinessAccountProfilePhoto';

  constructor(payload: RemoveBusinessAccountProfilePhotoOptions) {
    super(payload);
  }
}

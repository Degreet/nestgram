import { ApiMethod } from './api-method';
import type { RawMessageEntity } from '../../events/raw-update.types';

export interface VerifyUserOptions {
  user_id: number;
  custom_description?: string;
  custom_description_parse_mode?: string;
  custom_description_entities?: RawMessageEntity[];
}

/**
 * Verifies a user on behalf of the organization which is represented by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#verifyuser
 */
export class VerifyUser extends ApiMethod<VerifyUserOptions, true> {
  readonly method = 'verifyUser';

  constructor(payload: VerifyUserOptions) {
    super(payload);
  }
}

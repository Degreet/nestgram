import { ApiMethod } from './api-method';

export interface SetUserEmojiStatusOptions {
  user_id: number;
  emoji_status_custom_emoji_id?: string;
  emoji_status_expiration_date?: number;
}

export class SetUserEmojiStatus extends ApiMethod<
  SetUserEmojiStatusOptions,
  true
> {
  readonly method = 'setUserEmojiStatus';

  constructor(payload: SetUserEmojiStatusOptions) {
    super(payload);
  }
}

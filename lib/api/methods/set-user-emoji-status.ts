import { ApiMethod } from './api-method';

export interface SetUserEmojiStatusOptions {
  user_id: number;
  emoji_status_custom_emoji_id?: string;
  emoji_status_expiration_date?: number;
}

/**
 * Changes the emoji status for a given user that previously allowed the bot to manage their emoji status via the Mini App method requestEmojiStatusAccess. Returns True on success.
 * @see https://core.telegram.org/bots/api#setuseremojistatus
 */
export class SetUserEmojiStatus extends ApiMethod<
  SetUserEmojiStatusOptions,
  true
> {
  readonly method = 'setUserEmojiStatus';

  constructor(payload: SetUserEmojiStatusOptions) {
    super(payload);
  }
}

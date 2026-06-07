import { ApiMethod } from './api-method';
import type { RawMessageEntity } from '../../events/raw-update.types';

export interface SendGiftOptions {
  user_id?: number;
  chat_id?: number | string;
  gift_id: string;
  pay_for_upgrade?: boolean;
  text?: string;
  text_parse_mode?: string;
  text_entities?: RawMessageEntity[];
}

/**
 * Sends a gift to the given user or channel chat. The gift can't be converted to Telegram Stars by the receiver. Returns True on success.
 * @see https://core.telegram.org/bots/api#sendgift
 */
export class SendGift extends ApiMethod<SendGiftOptions, true> {
  readonly method = 'sendGift';

  constructor(payload: SendGiftOptions) {
    super(payload);
  }
}

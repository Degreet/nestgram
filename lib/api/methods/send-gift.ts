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

export class SendGift extends ApiMethod<SendGiftOptions, true> {
  readonly method = 'sendGift';

  constructor(payload: SendGiftOptions) {
    super(payload);
  }
}

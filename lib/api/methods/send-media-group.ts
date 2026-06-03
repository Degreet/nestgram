import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import { InputFile } from '../input-file';
import {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from '../input-media';

export interface SendMediaGroupOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  media: Array<
    InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
  >;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: any;
}

export class SendMediaGroup extends ApiMethod<
  SendMediaGroupOptions,
  Message[]
> {
  readonly method = 'sendMediaGroup';
  readonly isAttachMedia = true;

  constructor(payload: SendMediaGroupOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return (
      this.payload?.media.some((media) => media.media instanceof InputFile) ??
      false
    );
  }

  wrap(raw: unknown, bot: BotService): Message[] {
    return (raw as Partial<Message>[]).map(
      (object) => new Message(bot, object),
    );
  }
}

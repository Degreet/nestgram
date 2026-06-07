import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import { InputFile } from '../input-file';
import type {
  RawInputMedia,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendMediaGroupOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  media: RawInputMedia[];
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: RawReplyParameters;
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
      this.payload?.media.some((item) => item.media instanceof InputFile) ??
      false
    );
  }

  wrap(raw: unknown, bot: BotService): Message[] {
    return (raw as Partial<Message>[]).map(
      (object) => new Message(bot, object),
    );
  }
}

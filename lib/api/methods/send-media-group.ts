import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import { hasInputFile } from '../form-data';
import type {
  RawInputMedia,
  RawMessage,
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

/**
 * Use this method to send a group of photos, live photos, videos, documents or audios as an album. Documents and audio files can be only grouped in an album with messages of the same type. On success, an Array of Message objects that were sent is returned.
 * @see https://core.telegram.org/bots/api#sendmediagroup
 */
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
    return hasInputFile(this.payload);
  }

  wrap(raw: unknown, bot: BotService): Message[] {
    return (raw as Partial<RawMessage>[]).map(
      (object) => new Message(bot, object),
    );
  }
}

import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawMessage,
  RawMessageEntity,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface EditMessageCaptionOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit captions of messages. On success, if the edited message is not an inline message, the edited Message is returned, otherwise True is returned. Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours from the time they were sent.
 * @see https://core.telegram.org/bots/api#editmessagecaption
 */
export class EditMessageCaption extends ApiMethod<
  EditMessageCaptionOptions,
  RawMessage | boolean
> {
  readonly method = 'editMessageCaption';

  constructor(payload?: EditMessageCaptionOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawMessageEntity,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface EditEphemeralMessageCaptionOptions {
  chat_id: number | string;
  receiver_user_id: number;
  ephemeral_message_id: number;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit the caption of an ephemeral message. Note that it is not guaranteed that the user will receive the message edit event, especially if they are offline. On success, True is returned.
 * @see https://core.telegram.org/bots/api#editephemeralmessagecaption
 */
export class EditEphemeralMessageCaption extends ApiMethod<
  EditEphemeralMessageCaptionOptions,
  true
> {
  readonly method = 'editEphemeralMessageCaption';

  constructor(payload: EditEphemeralMessageCaptionOptions) {
    super(payload);
  }
}

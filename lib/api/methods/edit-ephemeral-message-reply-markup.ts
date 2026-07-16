import { ApiMethod } from './api-method';
import type { RawInlineKeyboardMarkup } from '../../events/raw-update.types';

export interface EditEphemeralMessageReplyMarkupOptions {
  chat_id: number | string;
  receiver_user_id: number;
  ephemeral_message_id: number;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit only the reply markup of an ephemeral message. Note that it is not guaranteed that the user will receive the message edit event, especially if they are offline. On success, True is returned.
 * @see https://core.telegram.org/bots/api#editephemeralmessagereplymarkup
 */
export class EditEphemeralMessageReplyMarkup extends ApiMethod<
  EditEphemeralMessageReplyMarkupOptions,
  true
> {
  readonly method = 'editEphemeralMessageReplyMarkup';

  constructor(payload: EditEphemeralMessageReplyMarkupOptions) {
    super(payload);
  }
}

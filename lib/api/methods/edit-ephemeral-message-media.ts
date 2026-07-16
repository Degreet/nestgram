import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type {
  RawInlineKeyboardMarkup,
  RawInputMedia,
} from '../../events/raw-update.types';

export interface EditEphemeralMessageMediaOptions {
  chat_id: number | string;
  receiver_user_id: number;
  ephemeral_message_id: number;
  media: RawInputMedia;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit the media of an ephemeral message. Note that it is not guaranteed that the user will receive the message edit event, especially if they are offline. On success, True is returned.
 * @see https://core.telegram.org/bots/api#editephemeralmessagemedia
 */
export class EditEphemeralMessageMedia extends ApiMethod<
  EditEphemeralMessageMediaOptions,
  true
> {
  readonly method = 'editEphemeralMessageMedia';

  readonly isAttachMedia = true;

  constructor(payload: EditEphemeralMessageMediaOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

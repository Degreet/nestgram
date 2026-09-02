import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type {
  RawInlineKeyboardMarkup,
  RawInputRichMessage,
  RawLinkPreviewOptions,
  RawMessageEntity,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface EditEphemeralMessageTextOptions {
  chat_id: number | string;
  receiver_user_id: number;
  ephemeral_message_id: number;
  text?: string;
  parse_mode?: ParseModeValue;
  entities?: RawMessageEntity[];
  rich_message?: RawInputRichMessage;
  link_preview_options?: RawLinkPreviewOptions;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit an ephemeral text or rich message. Note that it is not guaranteed that the user will receive the message edit event, especially if they are offline. On success, True is returned.
 * @see https://core.telegram.org/bots/api#editephemeralmessagetext
 */
export class EditEphemeralMessageText extends ApiMethod<
  EditEphemeralMessageTextOptions,
  true
> {
  readonly method = 'editEphemeralMessageText';

  readonly isAttachMedia = true;

  constructor(payload: EditEphemeralMessageTextOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

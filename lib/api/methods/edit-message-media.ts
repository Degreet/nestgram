import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type {
  RawInlineKeyboardMarkup,
  RawInputMedia,
  RawMessage,
} from '../../events/raw-update.types';

export interface EditMessageMediaOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  media: RawInputMedia;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit animation, audio, document, live photo, photo, or video messages, or to replace a text or a rich message with a media. If a message is part of a message album, then it can be edited only to an audio for audio albums, only to a document for document albums and to a photo, a live photo, or a video otherwise. When an inline message is edited, a new file can't be uploaded; use a previously uploaded file via its file_id or specify a URL. On success, if the edited message is not an inline message, the edited Message is returned, otherwise True is returned. Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours from the time they were sent.
 * @see https://core.telegram.org/bots/api#editmessagemedia
 */
export class EditMessageMedia extends ApiMethod<
  EditMessageMediaOptions,
  RawMessage | boolean
> {
  readonly method = 'editMessageMedia';

  readonly isAttachMedia = true;

  constructor(payload: EditMessageMediaOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

import { ApiMethod } from './api-method';
import { InputFile } from '../input-file';
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
    return this.payload?.media.media instanceof InputFile;
  }
}

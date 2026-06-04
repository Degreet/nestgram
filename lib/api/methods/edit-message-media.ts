import { ApiMethod } from './api-method';
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

  constructor(payload: EditMessageMediaOptions) {
    super(payload);
  }
}

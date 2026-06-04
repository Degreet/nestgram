import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawMessage,
  RawMessageEntity,
} from '../../events/raw-update.types';

export interface EditMessageCaptionOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

export class EditMessageCaption extends ApiMethod<
  EditMessageCaptionOptions,
  RawMessage | boolean
> {
  readonly method = 'editMessageCaption';

  constructor(payload?: EditMessageCaptionOptions) {
    super(payload);
  }
}

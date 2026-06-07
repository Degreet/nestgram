import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawInputChecklist,
  RawMessage,
} from '../../events/raw-update.types';

export interface EditMessageChecklistOptions {
  business_connection_id: string;
  chat_id: number | string;
  message_id: number;
  checklist: RawInputChecklist;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit a checklist on behalf of a connected business account. On success, the edited Message is returned.
 * @see https://core.telegram.org/bots/api#editmessagechecklist
 */
export class EditMessageChecklist extends ApiMethod<
  EditMessageChecklistOptions,
  RawMessage
> {
  readonly method = 'editMessageChecklist';

  constructor(payload: EditMessageChecklistOptions) {
    super(payload);
  }
}

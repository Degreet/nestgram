import { ApiMethod } from './api-method';
import type {
  RawInlineQueryResult,
  RawPreparedInlineMessage,
} from '../../events/raw-update.types';

export interface SavePreparedInlineMessageOptions {
  user_id: number;
  result: RawInlineQueryResult;
  allow_user_chats?: boolean;
  allow_bot_chats?: boolean;
  allow_group_chats?: boolean;
  allow_channel_chats?: boolean;
}

/**
 * Stores a message that can be sent by a user of a Mini App. Returns a PreparedInlineMessage object.
 * @see https://core.telegram.org/bots/api#savepreparedinlinemessage
 */
export class SavePreparedInlineMessage extends ApiMethod<
  SavePreparedInlineMessageOptions,
  RawPreparedInlineMessage
> {
  readonly method = 'savePreparedInlineMessage';

  constructor(payload: SavePreparedInlineMessageOptions) {
    super(payload);
  }
}

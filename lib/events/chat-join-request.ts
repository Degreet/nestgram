import { CallOptions } from '../api';
import { ApproveChatJoinRequest, DeclineChatJoinRequest } from '../api/methods';
import { UpdateType } from '../decorators';
import { RawChatJoinRequest } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface ChatJoinRequest extends RawChatJoinRequest {}

/** A request to join a chat. Approve or decline it. */
@UpdateType('chat_join_request')
export class ChatJoinRequest extends RichEvent {
  approve(options: CallOptions = {}) {
    return this.bot.call(
      new ApproveChatJoinRequest({
        chat_id: this.chat.id,
        user_id: this.from.id,
      }),
      options,
    );
  }

  decline(options: CallOptions = {}) {
    return this.bot.call(
      new DeclineChatJoinRequest({
        chat_id: this.chat.id,
        user_id: this.from.id,
      }),
      options,
    );
  }
}

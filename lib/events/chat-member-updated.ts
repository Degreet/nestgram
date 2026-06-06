import { UpdateType } from '../decorators';
import { RawChatMemberUpdated } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface ChatMemberUpdated extends RawChatMemberUpdated {}

/**
 * A chat member's status changed. Delivered for both `my_chat_member` (the bot's
 * own status) and `chat_member` (another member's, when the bot is an admin).
 */
@UpdateType('my_chat_member', 'chat_member')
export class ChatMemberUpdated extends RichEvent {}

import { UpdateType } from '../decorators';
import { RawChatBoostRemoved } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface ChatBoostRemoved extends RawChatBoostRemoved {}

/** A boost was removed from a chat. */
@UpdateType('removed_chat_boost')
export class ChatBoostRemoved extends RichEvent {}

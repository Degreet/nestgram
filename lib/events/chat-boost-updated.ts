import { UpdateType } from '../decorators';
import { RawChatBoostUpdated } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface ChatBoostUpdated extends RawChatBoostUpdated {}

/** A chat boost was added or changed. */
@UpdateType('chat_boost')
export class ChatBoostUpdated extends RichEvent {}

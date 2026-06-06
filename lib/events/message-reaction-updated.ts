import { UpdateType } from '../decorators';
import { RawMessageReactionUpdated } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface MessageReactionUpdated extends RawMessageReactionUpdated {}

/** A user changed their reaction on a message (non-anonymous). */
@UpdateType('message_reaction')
export class MessageReactionUpdated extends RichEvent {}

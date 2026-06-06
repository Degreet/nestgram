import { UpdateType } from '../decorators';
import { RawMessageReactionCountUpdated } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface MessageReactionCountUpdated
  extends RawMessageReactionCountUpdated {}

/** Anonymous reaction counts on a message changed. */
@UpdateType('message_reaction_count')
export class MessageReactionCountUpdated extends RichEvent {}

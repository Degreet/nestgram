import { UpdateType } from '../decorators';
import { RawMessageGenerationStopped } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface MessageGenerationStopped extends RawMessageGenerationStopped {}

/**
 * A user stopped the bot's in-progress message generation — the stop button on
 * a draft sent with `can_stop`. {@link MessageGenerationStopped.draft_id}
 * identifies which draft, so a handler can cancel the work behind it.
 */
@UpdateType('stopped_message_generation')
export class MessageGenerationStopped extends RichEvent {}

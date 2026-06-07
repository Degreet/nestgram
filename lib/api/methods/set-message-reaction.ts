import { ApiMethod } from './api-method';
import type { RawReactionType } from '../../events/raw-update.types';

export interface SetMessageReactionOptions {
  chat_id: number | string;
  message_id: number;
  reaction?: RawReactionType[];
  is_big?: boolean;
}

/**
 * Use this method to change the chosen reactions on a message. Service messages of some types can't be reacted to. Automatically forwarded messages from a channel to its discussion group have the same available reactions as messages in the channel. Bots can't use paid reactions. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmessagereaction
 */
export class SetMessageReaction extends ApiMethod<
  SetMessageReactionOptions,
  true
> {
  readonly method = 'setMessageReaction';

  constructor(payload: SetMessageReactionOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawReactionType } from '../../events/raw-update.types';

export interface SetMessageReactionOptions {
  chat_id: number | string;
  message_id: number;
  reaction?: RawReactionType[];
  is_big?: boolean;
}

export class SetMessageReaction extends ApiMethod<
  SetMessageReactionOptions,
  true
> {
  readonly method = 'setMessageReaction';

  constructor(payload: SetMessageReactionOptions) {
    super(payload);
  }
}

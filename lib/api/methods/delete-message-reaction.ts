import { ApiMethod } from './api-method';

export interface DeleteMessageReactionOptions {
  chat_id: number | string;
  message_id: number;
  user_id?: number;
  actor_chat_id?: number;
}

export class DeleteMessageReaction extends ApiMethod<
  DeleteMessageReactionOptions,
  true
> {
  readonly method = 'deleteMessageReaction';

  constructor(payload: DeleteMessageReactionOptions) {
    super(payload);
  }
}

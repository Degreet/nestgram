import { ApiMethod } from './api-method';

export interface DeleteAllMessageReactionsOptions {
  chat_id: number | string;
  user_id?: number;
  actor_chat_id?: number;
}

export class DeleteAllMessageReactions extends ApiMethod<
  DeleteAllMessageReactionsOptions,
  true
> {
  readonly method = 'deleteAllMessageReactions';

  constructor(payload: DeleteAllMessageReactionsOptions) {
    super(payload);
  }
}

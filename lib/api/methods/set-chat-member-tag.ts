import { ApiMethod } from './api-method';

export interface SetChatMemberTagOptions {
  chat_id: number | string;
  user_id: number;
  tag?: string;
}

export class SetChatMemberTag extends ApiMethod<SetChatMemberTagOptions, true> {
  readonly method = 'setChatMemberTag';

  constructor(payload: SetChatMemberTagOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface GetChatMemberCountOptions {
  chat_id: number | string;
}

export class GetChatMemberCount extends ApiMethod<
  GetChatMemberCountOptions,
  number
> {
  readonly method = 'getChatMemberCount';

  constructor(payload: GetChatMemberCountOptions) {
    super(payload);
  }
}

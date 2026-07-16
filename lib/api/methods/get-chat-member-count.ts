import { ApiMethod } from './api-method';

export interface GetChatMemberCountOptions {
  chat_id: number | string;
}

/**
 * Use this method to get the number of members in a chat. Returns Integer on success.
 * @see https://core.telegram.org/bots/api#getchatmembercount
 */
export class GetChatMemberCount extends ApiMethod<
  GetChatMemberCountOptions,
  number
> {
  readonly method = 'getChatMemberCount';

  constructor(payload: GetChatMemberCountOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface ApproveChatJoinRequestOptions {
  chat_id: number | string;
  user_id: number;
}

export class ApproveChatJoinRequest extends ApiMethod<
  ApproveChatJoinRequestOptions,
  true
> {
  readonly method = 'approveChatJoinRequest';

  constructor(payload: ApproveChatJoinRequestOptions) {
    super(payload);
  }
}

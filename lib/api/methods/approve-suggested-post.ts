import { ApiMethod } from './api-method';

export interface ApproveSuggestedPostOptions {
  chat_id: number;
  message_id: number;
  send_date?: number;
}

export class ApproveSuggestedPost extends ApiMethod<
  ApproveSuggestedPostOptions,
  true
> {
  readonly method = 'approveSuggestedPost';

  constructor(payload: ApproveSuggestedPostOptions) {
    super(payload);
  }
}

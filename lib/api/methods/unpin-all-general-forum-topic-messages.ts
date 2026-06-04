import { ApiMethod } from './api-method';

export interface UnpinAllGeneralForumTopicMessagesOptions {
  chat_id: number | string;
}

export class UnpinAllGeneralForumTopicMessages extends ApiMethod<
  UnpinAllGeneralForumTopicMessagesOptions,
  true
> {
  readonly method = 'unpinAllGeneralForumTopicMessages';

  constructor(payload: UnpinAllGeneralForumTopicMessagesOptions) {
    super(payload);
  }
}

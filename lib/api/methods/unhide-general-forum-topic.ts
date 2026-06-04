import { ApiMethod } from './api-method';

export interface UnhideGeneralForumTopicOptions {
  chat_id: number | string;
}

export class UnhideGeneralForumTopic extends ApiMethod<
  UnhideGeneralForumTopicOptions,
  true
> {
  readonly method = 'unhideGeneralForumTopic';

  constructor(payload: UnhideGeneralForumTopicOptions) {
    super(payload);
  }
}

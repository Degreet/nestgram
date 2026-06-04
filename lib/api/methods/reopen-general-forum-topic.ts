import { ApiMethod } from './api-method';

export interface ReopenGeneralForumTopicOptions {
  chat_id: number | string;
}

export class ReopenGeneralForumTopic extends ApiMethod<
  ReopenGeneralForumTopicOptions,
  true
> {
  readonly method = 'reopenGeneralForumTopic';

  constructor(payload: ReopenGeneralForumTopicOptions) {
    super(payload);
  }
}

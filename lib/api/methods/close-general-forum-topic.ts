import { ApiMethod } from './api-method';

export interface CloseGeneralForumTopicOptions {
  chat_id: number | string;
}

export class CloseGeneralForumTopic extends ApiMethod<
  CloseGeneralForumTopicOptions,
  true
> {
  readonly method = 'closeGeneralForumTopic';

  constructor(payload: CloseGeneralForumTopicOptions) {
    super(payload);
  }
}

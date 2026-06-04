import { ApiMethod } from './api-method';

export interface HideGeneralForumTopicOptions {
  chat_id: number | string;
}

export class HideGeneralForumTopic extends ApiMethod<
  HideGeneralForumTopicOptions,
  true
> {
  readonly method = 'hideGeneralForumTopic';

  constructor(payload: HideGeneralForumTopicOptions) {
    super(payload);
  }
}

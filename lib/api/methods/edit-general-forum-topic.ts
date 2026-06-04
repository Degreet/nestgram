import { ApiMethod } from './api-method';

export interface EditGeneralForumTopicOptions {
  chat_id: number | string;
  name: string;
}

export class EditGeneralForumTopic extends ApiMethod<
  EditGeneralForumTopicOptions,
  true
> {
  readonly method = 'editGeneralForumTopic';

  constructor(payload: EditGeneralForumTopicOptions) {
    super(payload);
  }
}

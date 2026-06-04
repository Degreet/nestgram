import { ApiMethod } from './api-method';
import type { RawForumTopic } from '../../events/raw-update.types';

export interface CreateForumTopicOptions {
  chat_id: number | string;
  name: string;
  icon_color?: number;
  icon_custom_emoji_id?: string;
}

export class CreateForumTopic extends ApiMethod<
  CreateForumTopicOptions,
  RawForumTopic
> {
  readonly method = 'createForumTopic';

  constructor(payload: CreateForumTopicOptions) {
    super(payload);
  }
}

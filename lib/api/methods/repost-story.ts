import { ApiMethod } from './api-method';
import type { RawStory } from '../../events/raw-update.types';

export interface RepostStoryOptions {
  business_connection_id: string;
  from_chat_id: number;
  from_story_id: number;
  active_period: number;
  post_to_chat_page?: boolean;
  protect_content?: boolean;
}

export class RepostStory extends ApiMethod<RepostStoryOptions, RawStory> {
  readonly method = 'repostStory';

  constructor(payload: RepostStoryOptions) {
    super(payload);
  }
}

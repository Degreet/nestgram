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

/**
 * Reposts a story on behalf of a business account from another business account. Both business accounts must be managed by the same bot, and the story on the source account must have been posted (or reposted) by the bot. Requires the can_manage_stories business bot right for both business accounts. Returns Story on success.
 * @see https://core.telegram.org/bots/api#repoststory
 */
export class RepostStory extends ApiMethod<RepostStoryOptions, RawStory> {
  readonly method = 'repostStory';

  constructor(payload: RepostStoryOptions) {
    super(payload);
  }
}

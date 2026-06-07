import { ApiMethod } from './api-method';

export interface DeleteStoryOptions {
  business_connection_id: string;
  story_id: number;
}

/**
 * Deletes a story previously posted by the bot on behalf of a managed business account. Requires the can_manage_stories business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletestory
 */
export class DeleteStory extends ApiMethod<DeleteStoryOptions, true> {
  readonly method = 'deleteStory';

  constructor(payload: DeleteStoryOptions) {
    super(payload);
  }
}

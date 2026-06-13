import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type {
  RawInputStoryContent,
  RawMessageEntity,
  RawStory,
  RawStoryArea,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface PostStoryOptions {
  business_connection_id: string;
  content: RawInputStoryContent;
  active_period: number;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  areas?: RawStoryArea[];
  post_to_chat_page?: boolean;
  protect_content?: boolean;
}

/**
 * Posts a story on behalf of a managed business account. Requires the can_manage_stories business bot right. Returns Story on success.
 * @see https://core.telegram.org/bots/api#poststory
 */
export class PostStory extends ApiMethod<PostStoryOptions, RawStory> {
  readonly method = 'postStory';

  readonly isAttachMedia = true;

  constructor(payload: PostStoryOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

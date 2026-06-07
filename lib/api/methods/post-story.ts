import { ApiMethod } from './api-method';
import type {
  RawInputStoryContent,
  RawMessageEntity,
  RawStory,
  RawStoryArea,
} from '../../events/raw-update.types';

export interface PostStoryOptions {
  business_connection_id: string;
  content: RawInputStoryContent;
  active_period: number;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  caption_entities?: RawMessageEntity[];
  areas?: RawStoryArea[];
  post_to_chat_page?: boolean;
  protect_content?: boolean;
}

export class PostStory extends ApiMethod<PostStoryOptions, RawStory> {
  readonly method = 'postStory';

  constructor(payload: PostStoryOptions) {
    super(payload);
  }
}

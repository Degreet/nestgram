import { ApiMethod } from './api-method';
import type {
  RawInputStoryContent,
  RawMessageEntity,
  RawStory,
  RawStoryArea,
} from '../../events/raw-update.types';

export interface EditStoryOptions {
  business_connection_id: string;
  story_id: number;
  content: RawInputStoryContent;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  caption_entities?: RawMessageEntity[];
  areas?: RawStoryArea[];
}

export class EditStory extends ApiMethod<EditStoryOptions, RawStory> {
  readonly method = 'editStory';

  constructor(payload: EditStoryOptions) {
    super(payload);
  }
}

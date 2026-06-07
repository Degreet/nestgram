import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
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

/**
 * Edits a story previously posted by the bot on behalf of a managed business account. Requires the can_manage_stories business bot right. Returns Story on success.
 * @see https://core.telegram.org/bots/api#editstory
 */
export class EditStory extends ApiMethod<EditStoryOptions, RawStory> {
  readonly method = 'editStory';

  readonly isAttachMedia = true;

  constructor(payload: EditStoryOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

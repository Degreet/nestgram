import { ApiMethod } from './api-method';

export interface DeleteStoryOptions {
  business_connection_id: string;
  story_id: number;
}

export class DeleteStory extends ApiMethod<DeleteStoryOptions, true> {
  readonly method = 'deleteStory';

  constructor(payload: DeleteStoryOptions) {
    super(payload);
  }
}

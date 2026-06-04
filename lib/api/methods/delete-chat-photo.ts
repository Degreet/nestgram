import { ApiMethod } from './api-method';

export interface DeleteChatPhotoOptions {
  chat_id: number | string;
}

export class DeleteChatPhoto extends ApiMethod<DeleteChatPhotoOptions, true> {
  readonly method = 'deleteChatPhoto';

  constructor(payload: DeleteChatPhotoOptions) {
    super(payload);
  }
}

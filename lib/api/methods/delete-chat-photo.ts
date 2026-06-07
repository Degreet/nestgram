import { ApiMethod } from './api-method';

export interface DeleteChatPhotoOptions {
  chat_id: number | string;
}

/**
 * Use this method to delete a chat photo. Photos can't be changed for private chats. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletechatphoto
 */
export class DeleteChatPhoto extends ApiMethod<DeleteChatPhotoOptions, true> {
  readonly method = 'deleteChatPhoto';

  constructor(payload: DeleteChatPhotoOptions) {
    super(payload);
  }
}

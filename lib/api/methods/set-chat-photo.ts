import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';

export interface SetChatPhotoOptions {
  chat_id: number | string;
  photo: InputFile;
}

/**
 * Use this method to set a new profile photo for the chat. Photos can't be changed for private chats. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchatphoto
 */
export class SetChatPhoto extends ApiMethod<SetChatPhotoOptions, true> {
  readonly method = 'setChatPhoto';

  constructor(payload: SetChatPhotoOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

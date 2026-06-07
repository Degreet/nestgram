import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';

export interface SetChatPhotoOptions {
  chat_id: number | string;
  photo: InputFile;
}

export class SetChatPhoto extends ApiMethod<SetChatPhotoOptions, true> {
  readonly method = 'setChatPhoto';

  constructor(payload: SetChatPhotoOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class SaveFile extends MessageCreator {
  sendType: SendTypes = 'saveFile';
  type: MessageCreatorTypes = 'text';

  /**
   * Send chat action
   * @param path The path where you want to save the file
   * @param fileId Optional. File id you want to save. By default, sent media by the user
   * */
  constructor(public readonly path: string, public readonly fileId?: string) {
    super({});
  }
}

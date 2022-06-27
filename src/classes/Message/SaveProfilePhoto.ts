import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class SaveProfilePhoto extends MessageCreator {
  sendType: SendTypes = 'saveProfilePhoto';
  type: MessageCreatorTypes = 'text';

  /**
   * Send chat action
   * @param path The path where you want to save the file
   * @param index Optional. Index of the user profile photo you want to save. 0 index by default
   * */
  constructor(public readonly path: string, public readonly index?: number) {
    super({});
  }
}

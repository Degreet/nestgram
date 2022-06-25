import { MessageCreator } from './MessageCreator';
import { ChatActions, MessageCreatorTypes, SendTypes } from '../../types';

export class ChatAction extends MessageCreator {
  sendType: SendTypes = 'chatAction';
  type: MessageCreatorTypes = 'text';

  /**
   * Send chat action
   * @param action Chat action {@link ChatActions}
   * */
  constructor(public readonly action: ChatActions) {
    super({});
  }
}

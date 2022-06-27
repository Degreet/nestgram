import { ContentTypes, MessageCreatorTypes, SendTypes } from '../../types';

export class MessageCreator {
  type: MessageCreatorTypes;
  sendType: SendTypes;
  otherMessages: (MessageCreator | ContentTypes)[] = [];

  constructor(public readonly options: any = {}) {}

  /**
   * Add a message to send to the line
   * @param message Message to send
   * */
  add(message: MessageCreator | ContentTypes): this {
    this.otherMessages.push(message);
    return this;
  }
}

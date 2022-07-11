import { MessageCreatorTypes, NextLineAction, SendTypes } from '../../types';

export class MessageCreator {
  type: MessageCreatorTypes;
  sendType: SendTypes;
  otherActions: NextLineAction[] = [];

  constructor(public readonly options: any = {}) {}

  /**
   * Add an action or a message to send to the line
   * @param action Message to send or function (can be async)
   * */
  next(action: NextLineAction): this {
    this.otherActions.push(action);
    return this;
  }
}

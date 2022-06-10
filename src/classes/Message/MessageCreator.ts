import { MessageCreatorTypes, SendTypes } from '../../types';

export class MessageCreator {
  type: MessageCreatorTypes;
  sendType: SendTypes;

  constructor(public readonly options: any = {}) {}
}

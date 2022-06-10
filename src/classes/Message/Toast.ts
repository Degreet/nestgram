import { MessageCreator } from './MessageCreator';
import { IAnswerCallbackQueryOptions, MessageCreatorTypes, SendTypes } from '../../types';

export class Toast extends MessageCreator {
  sendType: SendTypes = 'toast';
  type: MessageCreatorTypes = 'text';

  /**
   * Toast on inline button click
   * @param text Toast text
   * @param options Message options {@link IAnswerCallbackQueryOptions}
   * */
  constructor(
    public readonly text: string,
    public readonly options: IAnswerCallbackQueryOptions = {},
  ) {
    super(options);
  }
}

import { MessageCreator } from './MessageCreator';
import { IAnswerCallbackQueryOptions, SendTypes } from '../../types';

export class Toast extends MessageCreator {
  sendType: SendTypes = 'toast';

  /**
   * Toast on inline button click
   * @param text Toast text
   * @param options Message options {@link IAnswerCallbackQueryOptions}
   * */
  constructor(
    public readonly text: string,
    public readonly options: IAnswerCallbackQueryOptions = {},
  ) {
    super(text, null, options);
  }
}

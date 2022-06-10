import { MessageCreator } from './MessageCreator';
import { IAnswerCallbackQueryOptions, MessageCreatorTypes, SendTypes } from '../../types';

export class Alert extends MessageCreator {
  sendType: SendTypes = 'alert';
  type: MessageCreatorTypes = 'text';

  /**
   * Alert on inline button click
   * @param text Alert text
   * @param options Message options {@link IAnswerCallbackQueryOptions}
   * */
  constructor(
    public readonly text: string,
    public readonly options: IAnswerCallbackQueryOptions = {},
  ) {
    super(options);
  }
}

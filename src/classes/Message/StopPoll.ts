import { MessageCreator } from './MessageCreator';
import { IStopPollOptions, MessageCreatorTypes, SendTypes } from '../../types';
import { Keyboard } from '../Keyboard/Keyboard';

export class StopPoll extends MessageCreator {
  sendType: SendTypes = 'stopPoll';
  type: MessageCreatorTypes = 'text';

  /**
   * Stop a poll
   * @param keyboard Keyboard you want to edit
   * @param msgId Optional. Message ID of the poll you want to stop. Current message id by default
   * @param chatId Optional. Chat ID in which poll you want to stop is located. Current chat id by default
   * @param moreOptions More options {@link IStopPollOptions}
   * @see https://core.telegram.org/bots/api#stoppoll
   * */
  constructor(
    public readonly keyboard?: Keyboard,
    public readonly msgId?: number | null,
    public readonly chatId?: number | string | null,
    public readonly moreOptions: IStopPollOptions = {},
  ) {
    super({});
  }
}

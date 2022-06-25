import { Media } from './Media';
import { ISendPollOptions, MediaSendTypes } from '../../types';

export class Poll extends Media {
  type: MediaSendTypes = 'poll';

  /**
   * Send contact
   * @param question Poll question
   * @param options Poll options (2-10 strings 1-100 characters each)
   * @param moreOptions Message options {@link ISendPollOptions}
   * @see https://core.telegram.org/bots/api#sendpoll
   * */
  constructor(
    public readonly question: string,
    public readonly options: string[],
    public readonly moreOptions: ISendPollOptions = {},
  ) {
    super('path', 'none', moreOptions);
  }
}

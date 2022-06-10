import { MessageCreator } from './MessageCreator';
import { IForwardMessageOptions, SendTypes } from '../../types';

export class Forward extends MessageCreator {
  sendType: SendTypes = 'forward';

  /**
   * Creates a wrapper for forward message
   * @param toChatId Chat id you want to forward message
   * @param options Message options {@link IForwardMessageOptions}
   * */
  constructor(
    public readonly toChatId: number | string,
    public readonly options: IForwardMessageOptions = {},
  ) {
    super(null, null, options);
  }
}

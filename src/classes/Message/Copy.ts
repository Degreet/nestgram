import { MessageCreator } from './MessageCreator';
import { ICopyMessageOptions, MessageCreatorTypes, SendTypes } from '../../types';
import { Keyboard } from '../Keyboard/Keyboard';

export class Copy extends MessageCreator {
  sendType: SendTypes = 'copy';
  type: MessageCreatorTypes = 'text';

  /**
   * Creates a wrapper for copy message
   * @param toChatId Chat id you want to copy message
   * @param keyboard Pass Keyboard class if you want to add keyboard to the message
   * @param options Message options {@link ICopyMessageOptions}
   * */
  constructor(
    public readonly toChatId: number | string,
    public readonly keyboard: Keyboard | null = null,
    public readonly options: ICopyMessageOptions = {},
  ) {
    super(options);
  }
}

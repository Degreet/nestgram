import { MessageCreator } from './MessageCreator';
import { ContentTypes, ISendOptions, SendTypes } from '../../types';
import { Keyboard } from '../Keyboard/Keyboard';

export class MessageSend extends MessageCreator {
  sendType: SendTypes = 'send';

  /**
   * Creates a wrapper for send message
   * @param content Content that you want to send
   * @param keyboard Keyboard that you want to add to the message
   * @param options Message options {@link ISendOptions}
   * */
  constructor(
    public readonly content: ContentTypes,
    public readonly keyboard: Keyboard | null = null,
    public readonly options: ISendOptions = {},
  ) {
    super(content, keyboard, options);
  }
}

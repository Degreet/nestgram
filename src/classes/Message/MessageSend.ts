import { MessageCreator } from './MessageCreator';
import { ContentTypes, ISendOptions, MessageCreatorTypes, SendTypes } from '../../types';
import { Keyboard } from '../Keyboard/Keyboard';

export class MessageSend extends MessageCreator {
  sendType: SendTypes = 'send';
  type: MessageCreatorTypes = 'text';

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
    super(options);
    if (keyboard) options.reply_markup = keyboard.buildMarkup();
  }
}

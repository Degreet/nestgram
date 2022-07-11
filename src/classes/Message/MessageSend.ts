import { MessageCreator } from './MessageCreator';
import { ContentTypes, MessageCreatorTypes, SendOptions, SendTypes } from '../../types';
import { Keyboard } from '../Keyboard/Keyboard';

export class MessageSend extends MessageCreator {
  sendType: SendTypes = 'send';
  type: MessageCreatorTypes = 'text';

  /**
   * Creates a wrapper for send message
   * @param content Content that you want to send
   * @param keyboard Keyboard that you want to add to the message
   * @param options Message options {@link SendOptions}
   * */
  constructor(
    public readonly content: ContentTypes,
    public readonly keyboard: Keyboard | null = null,
    public readonly options: SendOptions = {},
  ) {
    super(options);
    if (keyboard) options['reply_markup'] = keyboard.buildMarkup();
  }
}
